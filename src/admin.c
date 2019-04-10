#include <include/admin.h>
#include <string.h>


#define MEASUREMENT_COUNT (60)

typedef struct EcsAdminCtx {
    EcsComponentsHttpHandles http;
    ecs_entity_t admin_measurement_handle;
} EcsAdminCtx;

typedef struct Measurement {
    float current;
    ecs_ringbuf_t *data_1m;
    ecs_ringbuf_t *data_1h;
    ecs_ringbuf_t *min_1h;
    ecs_ringbuf_t *max_1h;
} Measurement;

typedef struct EcsAdminMeasurement {
    Measurement fps;
    Measurement frame;
    Measurement system;
    ecs_map_t *system_measurements;
    uint32_t tick;
    char *stats_json;
    ecs_os_mutex_t lock;
} EcsAdminMeasurement;

const ecs_array_params_t double_params = {
    .element_size = sizeof(double)
};

/* Add ringbuf to JSON */
static
void AddRingBufToJson(
    ut_strbuf *buf,
    const char *member,
    ecs_ringbuf_t *values)
{
    uint32_t i, count = ecs_ringbuf_count(values);
    ut_strbuf_append(buf, ",\"%s\":[", member);

    for (i = 0; i < count; i ++) {
        if (i) {
            ut_strbuf_appendstr(buf, ",");
        }
        double *value = ecs_ringbuf_get(
            values, &double_params, i);

        ut_strbuf_append(buf, "%f", *value);
    }

    ut_strbuf_appendstr(buf, "]");
}

/* Add measurement to JSON */
static
void AddMeasurementToJson(
    ut_strbuf *buf,
    const char *member,
    Measurement *measurement)
{
    ut_strbuf_append(buf, ",\"%s\":{", member);
    ut_strbuf_append(buf, "\"current\":%f", measurement->current);
    AddRingBufToJson(buf, "data_1m", measurement->data_1m);
    AddRingBufToJson(buf, "data_1h", measurement->data_1h);
    AddRingBufToJson(buf, "min_1h", measurement->min_1h);
    AddRingBufToJson(buf, "max_1h", measurement->max_1h);
    ut_strbuf_appendstr(buf, "}");
}

/* Add a system to JSON string */
static
void AddSystemsToJson(
    ut_strbuf *buf,
    ecs_array_t *systems,
    const char *json_member,
    bool *set,
    EcsAdminMeasurement *data)
{
    uint32_t i, count = ecs_array_count(systems);
    if (count) {
        if (*set) {
            ut_strbuf_appendstr(buf, ",");
        }

        *set = true;

        double fps = data->fps.current;
        double frame_time = data->frame.current * 1.0 / fps;

        ut_strbuf_append(buf, "\"%s\":[", json_member);
        EcsSystemStats *stats = ecs_array_buffer(systems);
        for (i = 0; i < count; i ++) {
            if (i) {
                ut_strbuf_appendstr(buf, ",");
            }
            ut_strbuf_append(buf,
                "{\"handle\":%d,\"id\":\"%s\",\"enabled\":%s,\"active\":%s,"\
                "\"tables_matched\":%u,\"entities_matched\":%u,"\
                "\"signature\":\"%s\",\"is_hidden\":%s,\"period\":%f,"
                "\"time_spent\":%f",
                (uint32_t)stats[i].handle,
                stats[i].id,
                stats[i].enabled ? "true" : "false",
                stats[i].active ? "true" : "false",
                stats[i].tables_matched,
                stats[i].entities_matched,
                stats[i].signature,
                stats[i].is_hidden ? "true" : "false",
                stats[i].period,
                (stats[i].time_spent / (frame_time * fps)) * 100 * 100);

            ecs_ringbuf_t *values = ecs_map_get(
                data->system_measurements,
                stats[i].handle);

            if (values) {
                AddRingBufToJson(buf, "time_spent_1m", values);
            }

            ut_strbuf_appendstr(buf, "}");
        }
        ut_strbuf_appendstr(buf, "]");
    }
}

/* Add a feature to JSON string */
static
void AddFeaturesToJson(
    ut_strbuf *buf,
    ecs_array_t *features)
{
    uint32_t i, count = ecs_array_count(features);

    if (count) {
        ut_strbuf_append(buf, ",\"features\":[");
        EcsFeatureStats *stats = ecs_array_buffer(features);
        for (i = 0; i < count; i ++) {
            if (i) {
                ut_strbuf_appendstr(buf, ",");
            }

            ut_strbuf_append(buf,
                "{\"id\":\"%s\",\"entities\":\"%s\",\"system_count\":%u,"\
                "\"systems_enabled\":%u,\"is_hidden\":%s}",
                stats[i].id,
                stats[i].entities,
                stats[i].system_count,
                stats[i].systems_enabled,
                stats[i].is_hidden ? "true" : "false");
        }
        ut_strbuf_appendstr(buf, "]");
    }
}

/* Utility function that creates a JSON string from world statistics */
static
char* JsonFromStats(
    ecs_world_t *world,
    ecs_world_stats_t *stats,
    EcsAdminMeasurement *measurements)
{
    ut_strbuf body = UT_STRBUF_INIT;

    ut_strbuf_append(&body,
        "{\"system_count\":%u,"\
        "\"table_count\":%u,\"entity_count\":%u,\"thread_count\":%u"
        ",\"frame_profiling\":%s,\"system_profiling\":%s",
        stats->system_count, stats->table_count, stats->entity_count,
        stats->thread_count,
        stats->frame_profiling ? "true" : "false",
        stats->system_profiling ? "true" : "false");

    ut_strbuf_append(&body, ",\"memory\":{"\
        "\"total\":{\"allocd\":%u,\"used\":%u},"\
        "\"components\":{\"allocd\":%u,\"used\":%u},"\
        "\"entities\":{\"allocd\":%u,\"used\":%u},"\
        "\"systems\":{\"allocd\":%u,\"used\":%u},"\
        "\"families\":{\"allocd\":%u,\"used\":%u},"\
        "\"tables\":{\"allocd\":%u,\"used\":%u},"\
        "\"stage\":{\"allocd\":%u,\"used\":%u},"\
        "\"world\":{\"allocd\":%u,\"used\":%u}}",
        stats->memory.total.allocd, stats->memory.total.used,
        stats->memory.components.allocd, stats->memory.components.used,
        stats->memory.entities.allocd, stats->memory.entities.used,
        stats->memory.systems.allocd, stats->memory.systems.used,
        stats->memory.families.allocd, stats->memory.families.used,
        stats->memory.tables.allocd, stats->memory.tables.used,
        stats->memory.stage.allocd, stats->memory.stage.used,
        stats->memory.world.allocd, stats->memory.world.used);

    ut_strbuf_appendstr(&body, ",\"tables\":[");
    if (ecs_array_count(stats->tables)) {
        EcsTableStats *tables = ecs_array_buffer(stats->tables);
        uint32_t i = 0, count = ecs_array_count(stats->tables);
        for (i = 0; i < count; i ++) {
            EcsTableStats *table = &tables[i];
            if (i) {
                ut_strbuf_append(&body, ",");
            }

            if (table->id) {
                ut_strbuf_append(&body, "{\"id\":\"%s\",", table->id);
            } else {
                ut_strbuf_append(&body, "{");
            }

            ut_strbuf_append(&body,
              "\"columns\":\"%s\",\"row_count\":%u,"
              "\"memory_used\":%u,\"memory_allocd\":%u}",
              table->columns, table->row_count, table->memory_used,
              table->memory_allocd);
        }
    }

    bool set = false;
    ut_strbuf_appendstr(&body, "],\"systems\":{");
    AddSystemsToJson(&body, stats->on_load_systems, "on_load", &set, measurements);
    AddSystemsToJson(&body, stats->post_load_systems, "post_load", &set, measurements);
    AddSystemsToJson(&body, stats->pre_update_systems, "pre_update", &set, measurements);
    AddSystemsToJson(&body, stats->on_update_systems, "on_update", &set, measurements);
    AddSystemsToJson(&body, stats->on_validate_systems, "on_validate", &set, measurements);
    AddSystemsToJson(&body, stats->post_update_systems, "post_update", &set, measurements);
    AddSystemsToJson(&body, stats->pre_store_systems, "pre_store", &set, measurements);
    AddSystemsToJson(&body, stats->on_store_systems, "on_store", &set, measurements);
    AddSystemsToJson(&body, stats->on_demand_systems, "on_demand", &set, measurements);
    AddSystemsToJson(&body, stats->on_add_systems, "on_add", &set, measurements);
    AddSystemsToJson(&body, stats->on_set_systems, "on_set", &set, measurements);
    AddSystemsToJson(&body, stats->on_remove_systems, "on_remove", &set, measurements);
    ut_strbuf_appendstr(&body, "}");

    AddFeaturesToJson(&body, stats->features);

    AddMeasurementToJson(&body, "fps", &measurements->fps);
    AddMeasurementToJson(&body, "frame", &measurements->frame);
    AddMeasurementToJson(&body, "system", &measurements->system);

    ut_strbuf_appendstr(&body, "}");

    return ut_strbuf_get(&body);
}

/* HTTP endpoint that returns statistics for the world & configures world */
static
bool RequestWorld(
    ecs_world_t *world,
    ecs_entity_t entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    if (request->method == EcsHttpGet) {
        ecs_type_t TEcsAdminMeasurement = (ecs_type_t)(uintptr_t)endpoint->ctx;
        EcsAdminMeasurement *stats = ecs_get_ptr(world, entity, EcsAdminMeasurement);

        char *stats_json = NULL;
        ecs_os_mutex_lock(stats->lock);

        if (stats->stats_json) {
            stats_json = strdup(stats->stats_json);
        }

        ecs_os_mutex_unlock(stats->lock);

        if (!stats_json) {
            reply->status = 204;
            return true;
        }

        reply->body = stats_json;

    } else if (request->method == EcsHttpPost) {
        if (!strcmp(request->params, "frame_profiling=true")) {
            ecs_measure_frame_time(world, true);
        } else if (!strcmp(request->params, "frame_profiling=false")) {
            ecs_measure_frame_time(world, false);
        } else if (!strcmp(request->params, "system_profiling=true")) {
            ecs_measure_system_time(world, true);
        } else if (!strcmp(request->params, "system_profiling=false")) {
            ecs_measure_system_time(world, false);
        }
    } else {
        fprintf(stderr, "unknown method received for world endpoint");
        return false;
    }

    return true;
}

/* HTTP endpoint that enables/disables systems */
static
bool RequestSystems(
    ecs_world_t *world,
    ecs_entity_t entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    ut_strbuf body = UT_STRBUF_INIT;

    ecs_entity_t system = ecs_lookup(world, request->relative_url);
    if (!system) {
        return false;
    }

    if (request->method == EcsHttpPost) {
        if (!strcmp(request->params, "enabled=false")) {
            ecs_enable(world, system, false);
        } else if (!strcmp(request->params, "enabled=true")) {
            ecs_enable(world, system, true);
        }
    }

    reply->body = ut_strbuf_get(&body);

    return true;
}

/* HTTP endpoint that returns file resources */
static
bool RequestFiles(
    ecs_world_t *world,
    ecs_entity_t entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    const char *file = request->relative_url;
    char bake_file[1024];

    if (!strlen(file)) {
        file = "index.html";
    }

    const char *etc_path = ut_locate(ut_getenv("BAKE_PROJECT_ID"), NULL, UT_LOCATE_ETC);

    sprintf(bake_file, "%s/%s", etc_path, file);

    if (ut_file_test(bake_file) != 1) {
        return false;
    }

    reply->body = strdup(bake_file);
    reply->is_file = true;

    return true;
}

/* Utility to push a new measurement to a ringbuffer that loops every hour */
static
void PushMeasurement(
    Measurement *measurement,
    double current)
{
    double *value = ecs_ringbuf_push(measurement->data_1h, &double_params);
    double *max = ecs_ringbuf_push(measurement->max_1h, &double_params);
    double *min = ecs_ringbuf_push(measurement->min_1h, &double_params);
    *value = 0;
    *max = current;
    *min = current;
}

/* Utility to add a measurement to a ringbuffer that loops every hour */
static
void AddMeasurement(
    Measurement *measurement,
    double current)
{
    uint32_t index = ecs_ringbuf_index(measurement->data_1m);

    double *elem = ecs_ringbuf_push(measurement->data_1m, &double_params);
    *elem = current;

    measurement->current = current;

    if (!(index % MEASUREMENT_COUNT)) {
        PushMeasurement(measurement, current);
    }

    double *value = ecs_ringbuf_last(measurement->data_1h, &double_params);
    double *max = ecs_ringbuf_last(measurement->max_1h, &double_params);
    double *min = ecs_ringbuf_last(measurement->min_1h, &double_params);
    *value = (*value * index + current) / (index + 1);
    if (current > *max) *max = current;
    if (current < *min) *min = current;
}

/* Utility to keep track of history for system buffers */
static
void AddSystemMeasurement(
    EcsAdminMeasurement *data,
    ecs_world_stats_t *stats,
    ecs_array_t *systems,
    double fps)
{
    uint32_t i, count = ecs_array_count(systems);
    EcsSystemStats *buffer = ecs_array_buffer(systems);

    float total = 0;

    if (!data->system_measurements) {
        data->system_measurements = ecs_map_new(count);
    }

    for (i = 0; i < count; i ++) {
        ecs_ringbuf_t *buf;
        EcsSystemStats *system = &buffer[i];
        uint64_t buf64 = 0;
        if (!ecs_map_has(data->system_measurements, system->handle, &buf64)) {
            buf = ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT);
            ecs_map_set(data->system_measurements, system->handle, buf);
        } else {
            buf = (ecs_ringbuf_t*)(uintptr_t)buf64;
        }

        double *value = ecs_ringbuf_push(buf, &double_params);
        *value = (system->time_spent / stats->system_time) * 100;

        total += *value;
    }
}

/* System that periodically prepares statistics as JSON for the admin server */
static
void EcsAdminCollectData(ecs_rows_t *rows) {
    ecs_world_stats_t stats = {0};
    
    ecs_get_stats(rows->world, &stats);

    EcsAdminMeasurement *data = ecs_column(rows, EcsAdminMeasurement, 1);

    if (!stats.tick_count || !rows->delta_time) {
        return;
    }

    int i;
    for (i = 0; i < rows->count; i ++) {
        double fps = rows->delta_time
          ? (double)stats.tick_count / rows->delta_time
          : 0
          ;

        double frame = (stats.frame_time / stats.tick_count) * fps * 100;
        double system = (stats.system_time / stats.tick_count) * fps * 100;

        AddMeasurement(&data[i].fps, fps);
        AddMeasurement(&data[i].frame, frame);
        AddMeasurement(&data[i].system, system);

        AddSystemMeasurement(&data[i], &stats, stats.on_load_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.post_load_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.pre_update_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.on_update_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.on_validate_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.post_update_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.pre_store_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.on_store_systems, fps);
        AddSystemMeasurement(&data[i], &stats, stats.on_demand_systems, fps);

        char *json = JsonFromStats(rows->world, &stats, &data[i]);

        ecs_os_mutex_lock(data[i].lock);
        if (data[i].stats_json) {
            ecs_os_free(data[i].stats_json);
        }
        data[i].stats_json = json;
        ecs_os_mutex_unlock(data[i].lock);
    }

    ecs_free_stats(&stats);
}

static
Measurement InitMeasurement(void)
{
    Measurement result = {
      .data_1m = ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT),
      .data_1h = ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT),
      .min_1h = ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT),
      .max_1h = ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT),
    };

    return result;
}

/* System that starts admin server and inits EcsAdminMeasurement component */
static
void EcsAdminStart(ecs_rows_t *rows) {
    ecs_world_t *world = rows->world;
    EcsAdmin *admin = ecs_column(rows, EcsAdmin, 1);
    
    ecs_type_t TEcsAdminMeasurement = ecs_column_type(rows, 2);
    ECS_IMPORT_COLUMN(rows, EcsComponentsHttp, 3);

    int i;
    for (i = 0; i < rows->count; i ++) {
		ecs_os_mutex_t stats_lock = ecs_os_mutex_new();

        ecs_entity_t server = rows->entities[i];

        ecs_set(world, server, EcsHttpServer, {.port = admin[i].port});
          ecs_entity_t e_world = ecs_new_child(world, server, 0);
            ecs_set(world, e_world, EcsHttpEndpoint, {
                .url = "world",
                .action = RequestWorld,
                .ctx = (void*)(uintptr_t)TEcsAdminMeasurement,
                .synchronous = false 
            });

            ecs_set(world, e_world, EcsAdminMeasurement, {
              .fps = InitMeasurement(),
              .frame = InitMeasurement(),
              .system = InitMeasurement(),
              .lock = stats_lock
            });

          ecs_entity_t e_systems = ecs_new_child(world, server, 0);
            ecs_set(world, e_systems, EcsHttpEndpoint, {
                .url = "systems",
                .action = RequestSystems,
                .synchronous = true });

          ecs_entity_t e_files = ecs_new_child(world, server, 0);
            ecs_set(world, e_files, EcsHttpEndpoint, {
                .url = "",
                .action = RequestFiles,
                .synchronous = false });
    }
}

/* Utility function to cleanup measurement buffers */
static
void FreeMeasurement(
    Measurement *measurement)
{
    ecs_ringbuf_free(measurement->data_1m);
    ecs_ringbuf_free(measurement->data_1h);
    ecs_ringbuf_free(measurement->min_1h);
    ecs_ringbuf_free(measurement->max_1h);
}

/* System that cleans up data from EcsAdminMeasurement component */
static
void EcsAdminMeasurementDeinit(ecs_rows_t *rows) {
    EcsAdminMeasurement *data = ecs_column(rows, EcsAdminMeasurement, 1);
    int i;
    for (i = 0; i < rows->count; i ++) {
        FreeMeasurement(&data[i].fps);
        FreeMeasurement(&data[i].frame);
        FreeMeasurement(&data[i].system);
    }
}

void EcsSystemsAdmin(
    ecs_world_t *world,
    int flags,
    void *handles_out)
{
    EcsSystemsAdminHandles *handles = handles_out;

    /* Import HTTP components */
    ECS_IMPORT(world, EcsComponentsHttp, 0);

    /* Register EcsAdmin components */
    ECS_COMPONENT(world, EcsAdmin);
    ECS_COMPONENT(world, EcsAdminMeasurement);
    ECS_COMPONENT(world, EcsAdminCtx);

    /* Start admin server when an EcsAdmin component has been initialized */
    ECS_SYSTEM(world, EcsAdminStart, EcsOnSet, EcsAdmin, ID.EcsAdminMeasurement, $EcsComponentsHttp, SYSTEM.EcsHidden);
    ECS_SYSTEM(world, EcsAdminCollectData, EcsOnStore, EcsAdminMeasurement, SYSTEM.EcsHidden);
    ECS_SYSTEM(world, EcsAdminMeasurementDeinit, EcsOnRemove, EcsAdminMeasurement, SYSTEM.EcsHidden);

    /* Only execute data collection system once per second */
    ecs_set_period(world, EcsAdminCollectData, 1.0);

    /* Enable frame profiling */
    ecs_measure_frame_time(world, true);

    ut_init("admin");
    ut_load_init(NULL, NULL, NULL, NULL);

    ECS_SET_COMPONENT(handles, EcsAdmin);
}
