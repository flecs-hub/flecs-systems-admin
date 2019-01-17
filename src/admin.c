#include <include/admin.h>
#include <string.h>
#include <pthread.h>

#define MEASUREMENT_COUNT (60)

typedef struct _EcsAdminCtx {
    EcsComponentsHttpHandles http;
    EcsEntity admin_measurement_handle;
} _EcsAdminCtx;

typedef struct Measurement {
    float current;
    EcsRingBuf *data_1m;
    EcsRingBuf *data_1h;
    EcsRingBuf *min_1h;
    EcsRingBuf *max_1h;
} Measurement;

typedef struct _EcsAdminMeasurement {
    Measurement fps;
    Measurement frame;
    Measurement system;
    EcsMap *system_measurements;
    uint32_t tick;
    char *stats_json;
    pthread_mutex_t lock;
} _EcsAdminMeasurement;

const EcsArrayParams double_params = {
    .element_size = sizeof(double)
};

/* Add ringbuf to JSON */
static
void AddRingBufToJson(
    ut_strbuf *buf,
    const char *member,
    EcsRingBuf *values)
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
    EcsArray *systems,
    const char *json_member,
    bool *set,
    _EcsAdminMeasurement *data)
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
                "{\"id\":\"%s\",\"enabled\":%s,\"active\":%s,"\
                "\"tables_matched\":%u,\"entities_matched\":%u,"\
                "\"signature\":\"%s\",\"is_hidden\":%s,\"period\":%f,"
                "\"time_spent\":%f",
                stats[i].id,
                stats[i].enabled ? "true" : "false",
                stats[i].active ? "true" : "false",
                stats[i].tables_matched,
                stats[i].entities_matched,
                stats[i].signature,
                stats[i].is_hidden ? "true" : "false",
                stats[i].period,
                (stats[i].time_spent / (frame_time * fps)) * 100 * 100);

            EcsRingBuf *values = ecs_map_get(
                data->system_measurements,
                stats[i].system);

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
    EcsArray *features)
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
    EcsWorld *world,
    EcsWorldStats *stats,
    _EcsAdminMeasurement *measurements)
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
    AddSystemsToJson(&body, stats->frame_systems, "on_frame", &set, measurements);
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
    EcsWorld *world,
    EcsEntity entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    if (request->method == EcsHttpGet) {
        EcsEntity stats_handle = *(EcsEntity*)endpoint->ctx;
        _EcsAdminMeasurement *stats = ecs_get_ptr(world, entity, stats_handle);

        char *stats_json = NULL;
        pthread_mutex_lock(&stats->lock);

        if (stats->stats_json) {
            stats_json = strdup(stats->stats_json);
        }

        pthread_mutex_unlock(&stats->lock);

        if (!stats_json) {
            reply->status = 204;
            return false;
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
    }

    return true;
}

/* HTTP endpoint that enables/disables systems */
static
bool RequestSystems(
    EcsWorld *world,
    EcsEntity entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    ut_strbuf body = UT_STRBUF_INIT;

    EcsEntity system = ecs_lookup(world, request->relative_url);
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
    EcsWorld *world,
    EcsEntity entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    const char *file = request->relative_url;
    char bake_file[1024];

    if (!strlen(file)) {
        file = "index.html";
    }

    const char *etc_path = ut_locate(BAKE_PROJECT_ID, NULL, UT_LOCATE_ETC);

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
    _EcsAdminMeasurement *data,
    EcsWorldStats *stats,
    EcsArray *systems,
    double fps)
{
    uint32_t i, count = ecs_array_count(systems);
    EcsSystemStats *buffer = ecs_array_buffer(systems);

    float total = 0;

    if (!data->system_measurements) {
        data->system_measurements = ecs_map_new(count);
    }

    for (i = 0; i < count; i ++) {
        EcsRingBuf *buf;
        EcsSystemStats *system = &buffer[i];
        uint64_t buf64 = 0;
        if (!ecs_map_has(data->system_measurements, system->system, &buf64)) {
            buf = ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT);
            ecs_map_set(data->system_measurements, system->system, buf);
        } else {
            buf = (EcsRingBuf*)(uintptr_t)buf64;
        }

        double *value = ecs_ringbuf_push(buf, &double_params);
        *value = (system->time_spent / stats->system_time) * 100;

        total += *value;
    }
}

/* System that periodically prepares statistics as JSON for the admin server */
static
void EcsAdminCollectData(EcsRows *rows) {
    void *row;

    EcsWorldStats stats = {0};
    ecs_get_stats(rows->world, &stats);

    if (!stats.tick_count || !rows->delta_time) {
        return;
    }

    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        _EcsAdminMeasurement *data = ecs_data(rows, row, 0);

        double fps = rows->delta_time
          ? (double)stats.tick_count / rows->delta_time
          : 0
          ;

        double frame = (stats.frame_time / stats.tick_count) * fps * 100;
        double system = (stats.system_time / stats.tick_count) * fps * 100;

        AddMeasurement(&data->fps, fps);
        AddMeasurement(&data->frame, frame);
        AddMeasurement(&data->system, system);

        AddSystemMeasurement(data, &stats, stats.frame_systems, fps);
        AddSystemMeasurement(data, &stats, stats.on_demand_systems, fps);

        char *json = JsonFromStats(rows->world, &stats, data);

        pthread_mutex_lock(&data->lock);
        if (data->stats_json) {
            free(data->stats_json);
        }
        data->stats_json = json;
        pthread_mutex_unlock(&data->lock);
    }

    ecs_free_stats(rows->world, &stats);
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
void EcsAdminStart(EcsRows *rows) {
    EcsWorld *world = rows->world;
    _EcsAdminCtx *ctx = ecs_get_system_context(world, rows->system);
    EcsEntity _EcsAdminMeasurement_h = ctx->admin_measurement_handle;
    EcsComponentsHttp_DeclareHandles(ctx->http);

    void *row;
    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        EcsEntity server = ecs_entity(rows, row, 0);
        EcsAdmin *data = ecs_data(rows, row, 0);

        pthread_mutex_t stats_lock;
        pthread_mutex_init(&stats_lock, NULL);

        ecs_set(world, server, EcsHttpServer, {.port = data->port});
          EcsEntity e_world = ecs_new(world, server);

            ecs_set(world, e_world, EcsHttpEndpoint, {
                .url = "world",
                .action = RequestWorld,
                .ctx = &ctx->admin_measurement_handle,
                .synchronous = false });

            ecs_set(world, e_world, _EcsAdminMeasurement, {
              .fps = InitMeasurement(),
              .frame = InitMeasurement(),
              .system = InitMeasurement(),
              .lock = stats_lock
            });

          EcsEntity e_systems = ecs_new(world, server);
            ecs_set(world, e_systems, EcsHttpEndpoint, {
                .url = "systems",
                .action = RequestSystems,
                .synchronous = true });

          EcsEntity e_files = ecs_new(world, server);
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
void EcsAdminMeasurementDeinit(EcsRows *rows) {
    void *row;
    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        _EcsAdminMeasurement *ctx = ecs_data(rows, row, 0);
        FreeMeasurement(&ctx->fps);
        FreeMeasurement(&ctx->frame);
        FreeMeasurement(&ctx->system);
    }
}

void EcsSystemsAdmin(
    EcsWorld *world,
    int flags,
    void *handles_out)
{
    EcsSystemsAdminHandles *handles = handles_out;

    /* Import HTTP components */
    ECS_IMPORT(world, EcsComponentsHttp, 0);

    /* Register EcsAdmin components */
    ECS_COMPONENT(world, EcsAdmin);
    ECS_COMPONENT(world, _EcsAdminMeasurement);
    ECS_COMPONENT(world, _EcsAdminCtx);

    /* Start admin server when an EcsAdmin component has been initialized */
    ECS_SYSTEM(world, EcsAdminStart, EcsOnSet, EcsAdmin);
    ECS_SYSTEM(world, EcsAdminCollectData, EcsPostFrame, _EcsAdminMeasurement);
    ECS_SYSTEM(world, EcsAdminMeasurementDeinit, EcsOnRemove, _EcsAdminMeasurement);

    /* Make EcsComponentsHttp handles available to EcsAdminStart stystem */
    ecs_set_system_context(world, EcsAdminStart_h, _EcsAdminCtx, {
        .http = EcsComponentsHttp_h,
        .admin_measurement_handle = _EcsAdminMeasurement_h});

    /* Mark admin systems as framework systems so they don't clutter the UI */
    ecs_add(world, EcsAdminStart_h, EcsHidden_h);
    ecs_add(world, EcsAdminCollectData_h, EcsHidden_h);
    ecs_add(world, EcsAdminMeasurementDeinit_h, EcsHidden_h);

    /* Only execute data collection system once per second */
    ecs_set_period(world, EcsAdminCollectData_h, 1.0);

    ut_init("admin");
    ut_load_init(NULL, NULL, NULL);

    handles->Admin = EcsAdmin_h;
}
