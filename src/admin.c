#include <flecs_systems_admin.h>
#include "collect.h"
#include "http.h"
#include <string.h>

typedef struct http_metrics_t {
    ecs_entity_t AdminHttpReply;
} http_metrics_t;

http_metrics_t* http_metrics_ctx(
    ecs_entity_t AdminHttpReply)
{
    http_metrics_t *result = ecs_os_malloc(sizeof(http_metrics_t));
    result->AdminHttpReply = AdminHttpReply;
    return result;
}

/* HTTP endpoint that returns files */
static
bool request_files(
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

    const char *etc_path = ut_locate(BAKE_PROJECT_ID, NULL, UT_LOCATE_ETC);

    sprintf(bake_file, "%s/%s", etc_path, file);

    FILE *f = fopen(bake_file, "r");
    if (!f) {
        return false;
    } else {
        fclose(f);
    }

    reply->body = strdup(bake_file);
    reply->is_file = true;

    return true;
}

/* HTTP endpoint that enables/disables systems */
static
bool request_systems(
    ecs_world_t *world,
    ecs_entity_t entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    ecs_strbuf_t body = ECS_STRBUF_INIT;

    ecs_entity_t system = ecs_lookup(world, request->relative_url);
    if (!system) {
        return false;
    }

    if (request->method == EcsHttpPost) {
        if (!strcmp(request->params, "enabled=false")) {
            ecs_os_dbg("admin: disable system %s", ecs_get_id(world, system));
            ecs_enable(world, system, false);
        } else if (!strcmp(request->params, "enabled=true")) {
            ecs_os_dbg("admin: enable system %s", ecs_get_id(world, system));
            ecs_enable(world, system, true);
        }
    }

    reply->body = ecs_strbuf_get(&body);

    return true;
}

/* HTTP endpoint that returns world statistics */
static
bool request_world(
    ecs_world_t *world,
    ecs_entity_t entity,
    EcsHttpEndpoint *endpoint,
    EcsHttpRequest *request,
    EcsHttpReply *reply)
{
    if (request->method == EcsHttpGet) {
        ecs_strbuf_t reply_body = ECS_STRBUF_INIT;
        http_metrics_t *ctx = endpoint->ctx;

        ecs_run(world, ctx->AdminHttpReply, 0, &reply_body);

        reply->body = ecs_strbuf_get(&reply_body);
    } else {
        return false;
    }

    return true;
}

/* Start admin server */
static
void EcsAdminStart(ecs_rows_t *rows) {
    ecs_world_t *world = rows->world;
    EcsAdmin *admin = ecs_column(rows, EcsAdmin, 1);
    ECS_IMPORT_COLUMN(rows, FlecsComponentsHttp, 2);
    ECS_COLUMN_ENTITY(rows, AdminHttpReply, 3);

    int i;
    for (i = 0; i < rows->count; i ++) {
        ecs_entity_t server = rows->entities[i];

        ecs_set(world, server, EcsHttpServer, {.port = admin[i].port});
          ecs_entity_t e_world = ecs_new_child(world, server, 0);
            ecs_set(world, e_world, EcsHttpEndpoint, {
                .url = "world",
                .action = request_world,
                .ctx = http_metrics_ctx(AdminHttpReply),
                .synchronous = false 
            });

          ecs_entity_t e_systems = ecs_new_child(world, server, 0);
            ecs_set(world, e_systems, EcsHttpEndpoint, {
                .url = "systems",
                .action = request_systems,
                .synchronous = true });

          ecs_entity_t e_files = ecs_new_child(world, server, 0);
            ecs_set(world, e_files, EcsHttpEndpoint, {
                .url = "",
                .action = request_files,
                .synchronous = false });

            ecs_os_log("admin: service running on :%u", admin[i].port);
    }
}

void FlecsSystemsAdminImport(
    ecs_world_t *world,
    int flags)
{
    /* Import HTTP components */
    ECS_IMPORT(world, FlecsComponentsHttp, 0);

    /* Private imports */
    ECS_IMPORT(world, AdminCollect, 0); /* Collect derivative statistics */
    ECS_IMPORT(world, AdminHttp, 0);    /* Systems that produce HTTP reply */

    ECS_MODULE(world, FlecsSystemsAdmin);

    /* Register EcsAdmin components */
    ECS_COMPONENT(world, EcsAdmin);

    /* Start admin server when an EcsAdmin component has been initialized */
    ECS_SYSTEM(world, EcsAdminStart, EcsOnSet, EcsAdmin, $.FlecsComponentsHttp, 
        .AdminHttpReply,
        SYSTEM.EcsHidden);

    ECS_EXPORT_COMPONENT(EcsAdmin);
}