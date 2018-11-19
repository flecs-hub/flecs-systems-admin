#include <include/admin.h>
#include <string.h>
#include <reflecs/util/strbuf.h>
#include <reflecs/util/time.h>
#include <reflecs/util/stats.h>

#define MEASUREMENT_COUNT (50)
#define MEASUREMENT_INTERVAL (60)

typedef struct _EcsAdminCtx {
    EcsComponentsHttpHandles http;
    EcsHandle admin_measurement_handle;
} _EcsAdminCtx;

typedef struct _EcsAdminMeasurement {
    struct timespec time_start;
    EcsArray *values;
    uint32_t index;
    uint32_t interval;
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
                "\"tables_matched\":%u,\"entities_matched\":%u}",
                stats[i].id,
                stats[i].enabled ? "true" : "false",
                stats[i].active ? "true" : "false",
                stats[i].tables_matched,
                stats[i].entities_matched);
        }
        ut_strbuf_appendstr(buf, "]");
    }
}

static
void add_measurements(
    ut_strbuf *buf,
    _EcsAdminMeasurement *measurements)
{
    uint32_t i, index = measurements->index;
    double *values = ecs_array_buffer(measurements->values);

    ut_strbuf_appendstr(buf, ",\"fps\":[");

    for (i = 0; i < MEASUREMENT_COUNT; i ++) {
        if (i) {
            ut_strbuf_appendstr(buf, ",");
        }

        double value = values[(index + i) % MEASUREMENT_COUNT];
        if (value) {
            value = 1.0 / (value  / MEASUREMENT_INTERVAL);
        }

        ut_strbuf_append(buf, "%.2f", value);
    }

    ut_strbuf_appendstr(buf, "]");
}

static
bool request_world(
    EcsWorld *world,
    EcsHandle entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    ut_strbuf body = UT_STRBUF_INIT;
    EcsHandle _EcsAdminMeasurement_h = *(EcsHandle*)endpoint->ctx;
    _EcsAdminMeasurement *measurements =
        ecs_get_ptr(world, entity, _EcsAdminMeasurement_h);

    EcsWorldStats stats = {0};
    ecs_world_get_stats(world, &stats);

    ut_strbuf_append(&body,
        "{\"memory_used\":%u,\"memory_allocd\":%u,\"system_count\":%u,"\
        "\"table_count\":%u,\"entity_count\":%u,\"thread_count\":%u",
        stats.memory_used, stats.memory_allocd, stats.system_count,
        stats.table_count, stats.entity_count, stats.thread_count);

    ut_strbuf_appendstr(&body, ",\"tables\":[");
    if (ecs_array_count(stats.tables)) {
        EcsTableStats *tables = ecs_array_buffer(stats.tables);
        uint32_t i = 0, count = ecs_array_count(stats.tables);
        for (i = 0; i < count; i ++) {
            EcsTableStats *table = &tables[i];
            if (i) {
                ut_strbuf_append(&body, ",");
            }
            ut_strbuf_append(&body,
              "{\"columns\":\"%s\",\"row_count\":%u,\"memory_used\":%u,"\
              "\"memory_allocd\":%u}",
              table->columns, table->row_count, table->memory_used,
              table->memory_allocd);
        }
    }

    bool set = false;
    ut_strbuf_appendstr(&body, "],\"systems\":{");
    add_systems(&body, stats.periodic_systems, "periodic_systems", &set);
    add_systems(&body, stats.on_demand_systems, "on_demand_systems", &set);
    add_systems(&body, stats.on_add_systems, "on_add_systems", &set);
    add_systems(&body, stats.on_set_systems, "on_set_systems", &set);
    add_systems(&body, stats.on_remove_systems, "on_remove_systems", &set);
    ut_strbuf_appendstr(&body, "}");

    add_measurements(&body, measurements);
    ut_strbuf_appendstr(&body, "}");

    reply->body = ut_strbuf_get(&body);

    ecs_world_free_stats(world, &stats);

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
        EcsArray *measurements = ecs_array_new(&double_arr_params, MEASUREMENT_COUNT);
        ecs_array_set_count(&measurements, &double_arr_params, MEASUREMENT_COUNT);
        double *buffer = ecs_array_buffer(measurements);
        memset(buffer, 0, MEASUREMENT_COUNT * sizeof(double));

        ecs_set(world, server, EcsHttpServer, {.port = data->port});
          EcsHandle e_world = ecs_new(world, server);
            ecs_set(world, e_world, EcsHttpEndpoint, {
                .url = "world",
                .action = request_world,
                .ctx = &ctx->admin_measurement_handle});

            ecs_set(world, e_world, _EcsAdminMeasurement, {
                .values = measurements
            });

          EcsHandle e_systems = ecs_new(world, server);
            ecs_set(world, e_systems, EcsHttpEndpoint, {
                .url = "systems",
                .action = request_systems });

          EcsHandle e_files = ecs_new(world, server);
            ecs_set(world, e_files, EcsHttpEndpoint, {
                .url = "",
                .action = request_files });
    }
}

void EcsAdminMeasureTime(EcsRows *rows) {
    void *row;
    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        _EcsAdminMeasurement *data = ecs_column(rows, row, 0);
        if ((data->interval % MEASUREMENT_INTERVAL) == 0) {
            if (data->time_start.tv_sec) {
                double *buffer = ecs_array_buffer(data->values);
                double *t = &buffer[data->index];
                *t = ut_time_measure(data->time_start);
                data->index = (data->index + 1) % MEASUREMENT_COUNT;
            }

            ut_time_get(&data->time_start);
        }

        data->interval ++;
    }
}

void EcsAdminMeasurementDeinit(EcsRows *rows) {
    void *row;
    for (row = rows->first; row < rows->last; row = ecs_next(rows, row)) {
        _EcsAdminMeasurement *ctx = ecs_column(rows, row, 0);
        ecs_array_free(ctx->values);
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
    ECS_SYSTEM(world, EcsAdminMeasureTime, EcsPeriodic, _EcsAdminMeasurement);
    ECS_SYSTEM(world, EcsAdminMeasurementDeinit, EcsOnRemove, _EcsAdminMeasurement);

    /* Make EcsComponentsHttp handles available to EcsAdminStart stystem */
    ecs_set_system_context(world, EcsAdminStart_h, _EcsAdminCtx, {
        .http = EcsComponentsHttp_h,
        .admin_measurement_handle = _EcsAdminMeasurement_h});

    handles->Admin = EcsAdmin_h;
}
