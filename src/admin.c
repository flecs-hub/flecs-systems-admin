#include <include/admin.h>
#include <string.h>
#include <pthread.h>
#include <reflecs/util/strbuf.h>
#include <reflecs/util/time.h>
#include <reflecs/util/stats.h>

#define MEASUREMENT_COUNT (20)

typedef struct _EcsAdminCtx {
    EcsComponentsHttpHandles http;
    EcsHandle admin_measurement_handle;
} _EcsAdminCtx;

typedef struct _EcsAdminMeasurement {
    uint32_t prev_tick;
    EcsArray *fps;
    EcsArray *frame;
    uint32_t index;
    uint32_t counter;
    uint32_t interval;
    uint32_t recorded;
    char *stats_json;
    pthread_mutex_t lock;
} _EcsAdminMeasurement;

const EcsArrayParams double_arr_params = {
    .element_size = sizeof(double)
};

static
void add_systems(
    ut_strbuf *buf,
    EcsArray *systems,
    const char *json_member,
    bool *set)
{
    uint32_t i, count = ecs_array_count(systems);
    if (count) {
        if (*set) {
            ut_strbuf_appendstr(buf, ",");
        }

        *set = true;

        ut_strbuf_append(buf, "\"%s\":[", json_member);
        EcsSystemStats *stats = ecs_array_buffer(systems);
        for (i = 0; i < count; i ++) {
            if (i) {
                ut_strbuf_appendstr(buf, ",");
            }
            ut_strbuf_append(buf,
                "{\"id\":\"%s\",\"enabled\":%s,\"active\":%s,"\
                "\"tables_matched\":%u,\"entities_matched\":%u,"\
                "\"signature\":\"%s\",\"is_hidden\":%s,\"period\":%f}",
                stats[i].id,
                stats[i].enabled ? "true" : "false",
                stats[i].active ? "true" : "false",
                stats[i].tables_matched,
                stats[i].entities_matched,
                stats[i].signature,
                stats[i].is_hidden ? "true" : "false",
                stats[i].period);
        }
        ut_strbuf_appendstr(buf, "]");
    }
}

static
void add_features(
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

static
void add_measurements(
    ut_strbuf *buf,
    const char *member,
    _EcsAdminMeasurement *measurements,
    double *values)
{
    uint32_t i, index = measurements->index;

    ut_strbuf_append(buf, ",\"%s\":[", member);

    uint32_t start = MEASUREMENT_COUNT - measurements->recorded;
    for (i = start; i < MEASUREMENT_COUNT; i ++) {
        if (i != start) {
            ut_strbuf_appendstr(buf, ",");
        }

        double value = values[(index + i) % MEASUREMENT_COUNT];
        ut_strbuf_append(buf, "%f", value);
    }

    ut_strbuf_appendstr(buf, "]");
}

static
char* json_from_stats(
    EcsWorld *world,
    EcsWorldStats *stats,
    _EcsAdminMeasurement *measurements)
{
    ut_strbuf body = UT_STRBUF_INIT;

    ut_strbuf_append(&body,
        "{\"system_count\":%u,"\
        "\"table_count\":%u,\"entity_count\":%u,\"thread_count\":%u",
        stats->system_count, stats->table_count, stats->entity_count,
        stats->thread_count);

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
    add_systems(&body, stats->frame_systems, "on_frame", &set);
    add_systems(&body, stats->on_demand_systems, "on_demand", &set);
    add_systems(&body, stats->on_add_systems, "on_add", &set);
    add_systems(&body, stats->on_set_systems, "on_set", &set);
    add_systems(&body, stats->on_remove_systems, "on_remove", &set);
    ut_strbuf_appendstr(&body, "}");

    add_features(&body, stats->features);

    add_measurements(&body, "fps", measurements, ecs_array_buffer(measurements->fps));
    add_measurements(&body, "frame", measurements, ecs_array_buffer(measurements->frame));

    ut_strbuf_appendstr(&body, "}");

    return ut_strbuf_get(&body);
}

static
bool request_world(
    EcsWorld *world,
    EcsHandle entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    EcsHandle stats_handle = *(EcsHandle*)endpoint->ctx;
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

    return true;
}

bool request_systems(
    EcsWorld *world,
    EcsHandle entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    ut_strbuf body = UT_STRBUF_INIT;

    EcsHandle system = ecs_lookup(world, request->relative_url);
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

bool request_files(
    EcsWorld *world,
    EcsHandle entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    const char *file = request->relative_url;
    char bake_file[1024];
    char *bake_home = getenv("BAKE_HOME");
    char *bake_version = getenv("BAKE_VERSION");
    char *bake_platform = getenv("BAKE_PLATFORM");
    char *bake_config = getenv("BAKE_CONFIG");

    if (!strlen(file)) {
        file = "index.html";
    }

    sprintf(bake_file, "%s/%s/%s-%s/etc/reflecs/systems/admin/%s",
        bake_home, bake_version, bake_platform, bake_config, file);

    FILE *f = fopen(bake_file, "r");
    if (!f) {
        return false;
    }
    fclose(f);

    reply->body = strdup(bake_file);
    reply->is_file = true;

    return true;
}

void EcsAdminCollectData(EcsRows *rows) {
    void *row;
    double time = rows->delta_time;

    EcsWorldStats stats = {0};
    ecs_get_stats(rows->world, &stats);

    uint32_t tick = stats.tick_count;
    float frame_time = stats.frame_time;

    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        _EcsAdminMeasurement *data = ecs_column(rows, row, 0);

        double *buffer = ecs_array_buffer(data->fps);
        buffer[data->index] = (double)tick / time;

        buffer = ecs_array_buffer(data->frame);
        buffer[data->index] = frame_time;

        data->index = (data->index + 1) % MEASUREMENT_COUNT;
        if (data->recorded < MEASUREMENT_COUNT) {
            data->recorded ++;
        }

        char *json = json_from_stats(rows->world, &stats, data);

        pthread_mutex_lock(&data->lock);
        if (data->stats_json) {
            free(data->stats_json);
        }
        data->stats_json = json;
        pthread_mutex_unlock(&data->lock);

        data->prev_tick = tick;
    }

    ecs_free_stats(rows->world, &stats);
}

void EcsAdminStart(EcsRows *rows) {
    EcsWorld *world = rows->world;
    _EcsAdminCtx *ctx = ecs_get_system_context(world, rows->system);
    EcsHandle _EcsAdminMeasurement_h = ctx->admin_measurement_handle;
    EcsComponentsHttp_DeclareHandles(ctx->http);

    void *row;
    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        EcsHandle server = ecs_entity(row);
        EcsAdmin *data = ecs_column(rows, row, 0);

        /* Initialize measurements array */
        EcsArray *fps = ecs_array_new(&double_arr_params, MEASUREMENT_COUNT);
        ecs_array_set_count(&fps, &double_arr_params, MEASUREMENT_COUNT);
        double *buffer = ecs_array_buffer(fps);
        memset(buffer, 0, MEASUREMENT_COUNT * sizeof(double));

        EcsArray *frame = ecs_array_new(&double_arr_params, MEASUREMENT_COUNT);
        ecs_array_set_count(&frame, &double_arr_params, MEASUREMENT_COUNT);
        buffer = ecs_array_buffer(frame);
        memset(buffer, 0, MEASUREMENT_COUNT * sizeof(double));

        pthread_mutex_t stats_lock;
        pthread_mutex_init(&stats_lock, NULL);

        ecs_set(world, server, EcsHttpServer, {.port = data->port});
          EcsHandle e_world = ecs_new(world, server);
            ecs_set(world, e_world, EcsHttpEndpoint, {
                .url = "world",
                .action = request_world,
                .ctx = &ctx->admin_measurement_handle,
                .synchronous = false });

            ecs_set(world, e_world, _EcsAdminMeasurement, {
                .fps = fps,
                .frame = frame,
                .interval = 1,
                .lock = stats_lock
            });

          EcsHandle e_systems = ecs_new(world, server);
            ecs_set(world, e_systems, EcsHttpEndpoint, {
                .url = "systems",
                .action = request_systems,
                .synchronous = true });

          EcsHandle e_files = ecs_new(world, server);
            ecs_set(world, e_files, EcsHttpEndpoint, {
                .url = "",
                .action = request_files,
                .synchronous = false });
    }
}

void EcsAdminMeasurementDeinit(EcsRows *rows) {
    void *row;
    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        _EcsAdminMeasurement *ctx = ecs_column(rows, row, 0);
        ecs_array_free(ctx->fps);
        ecs_array_free(ctx->frame);
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
    ECS_SYSTEM(world, EcsAdminCollectData, EcsOnFrame, _EcsAdminMeasurement);
    ECS_SYSTEM(world, EcsAdminMeasurementDeinit, EcsOnRemove, _EcsAdminMeasurement);

    /* Make EcsComponentsHttp handles available to EcsAdminStart stystem */
    ecs_set_system_context(world, EcsAdminStart_h, _EcsAdminCtx, {
        .http = EcsComponentsHttp_h,
        .admin_measurement_handle = _EcsAdminMeasurement_h});

    /* Mark admin systems as framework systems so they don't clutter the UI */
    ecs_add(world, EcsAdminStart_h, EcsHidden_h);
    ecs_add(world, EcsAdminCollectData_h, EcsHidden_h);
    ecs_add(world, EcsAdminMeasurementDeinit_h, EcsHidden_h);
    ecs_commit(world, EcsAdminStart_h);
    ecs_commit(world, EcsAdminCollectData_h);
    ecs_commit(world, EcsAdminMeasurementDeinit_h);

    /* Only execute data collection system once per second */
    ecs_set_period(world, EcsAdminCollectData_h, 1.0);

    handles->Admin = EcsAdmin_h;
}
