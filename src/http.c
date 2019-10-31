#include <flecs_systems_admin.h>
#include "collect.h"
#include "http.h"

static
const ecs_vector_params_t double_params = {
    .element_size = sizeof(double)
};

static 
void write_buffer(
    ecs_strbuf_t *reply,
    ecs_ringbuf_t *buffer)
{
    uint32_t i, count = ecs_ringbuf_count(buffer);
    ecs_strbuf_list_push(reply, "[", ",");

    for (i = 0; i < count; i ++) {
        double *value = ecs_ringbuf_get(
            buffer, &double_params, i);

        ecs_strbuf_list_append(reply, "%f", *value);
    }

    ecs_strbuf_list_pop(reply, "]");
}

static
void write_admin_stat(
    ecs_strbuf_t *reply,
    admin_stat_t *stat,
    const char *metric_name)
{
    ecs_strbuf_list_append(reply, "\"%s\":", metric_name);
    
    ecs_strbuf_list_push     (reply, "{", ",");
    ecs_strbuf_list_append   (reply, "\"current\":%f", stat->current);
    ecs_strbuf_list_appendstr(reply, "\"data_1m\":");
    write_buffer(reply, stat->data_1m);
    ecs_strbuf_list_appendstr(reply, "\"data_1h\":");
    write_buffer(reply, stat->data_1h);
    ecs_strbuf_list_appendstr(reply, "\"min_1h\":");
    write_buffer(reply, stat->min_1h);
    ecs_strbuf_list_appendstr(reply, "\"max_1h\":");
    write_buffer(reply, stat->max_1h);
    ecs_strbuf_list_pop      (reply, "}");
}

static
void write_memory_stat(
    ecs_strbuf_t *reply,
    admin_memory_stat_t *stat,
    const char *metric_name)
{
    ecs_strbuf_list_append(reply, "\"%s\":", metric_name);
    ecs_strbuf_list_push(reply, "{", ",");
    write_admin_stat(reply, &stat->used, "used");
    write_admin_stat(reply, &stat->allocd, "allocd");
    ecs_strbuf_list_pop(reply, "}");
}

static
void AdminHttpReplyWorldStats(ecs_rows_t *rows) {
    ECS_COLUMN(rows, EcsWorldStats, stats, 1);
    ECS_COLUMN(rows, AdminWorldStats, admin_stats, 2);

    ecs_strbuf_t *reply = rows->param;

    ecs_strbuf_list_append(reply, "\"system_count\":%d", 
        stats->col_systems_count + stats->row_systems_count);

    ecs_strbuf_list_append(reply, "\"component_count\":%d", 
        stats->components_count);

    ecs_strbuf_list_append(reply, "\"table_count\":%d", 
        stats->tables_count);

    ecs_strbuf_list_append(reply, "\"entity_count\":%d", 
        stats->entities_count);

    ecs_strbuf_list_append(reply, "\"thread_count\":%d", 
        stats->threads_count);

    write_admin_stat(reply, &admin_stats->fps, "fps");
    write_admin_stat(reply, &admin_stats->frame, "frame");
    write_admin_stat(reply, &admin_stats->system, "system");
    write_admin_stat(reply, &admin_stats->merge, "merge");
}

static
void AdminHttpReplyMemoryStats(ecs_rows_t *rows) {
    ECS_COLUMN(rows, AdminMemoryStats, admin_stats, 1);

    ecs_strbuf_t *reply = rows->param;

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        write_memory_stat(reply, &admin_stats[i].total, "total");
        write_memory_stat(reply, &admin_stats[i].entities, "entities");
        write_memory_stat(reply, &admin_stats[i].components, "components");
        write_memory_stat(reply, &admin_stats[i].systems, "systems");
        write_memory_stat(reply, &admin_stats[i].types, "types");
        write_memory_stat(reply, &admin_stats[i].tables, "tables");
        write_memory_stat(reply, &admin_stats[i].stages, "stages");
        write_memory_stat(reply, &admin_stats[i].world, "world");
    }
}

static
void write_system_stats(
    ecs_rows_t *rows,
    EcsSystemKind system_kind)
{
    ECS_COLUMN(rows, EcsSystemStats, stats, 1);
    ECS_COLUMN(rows, AdminSystemStats, admin_stats, 2);

    ecs_strbuf_t *reply = rows->param;

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        if (stats[i].kind == system_kind) {
            ecs_strbuf_list_next(reply);
            ecs_strbuf_list_push(reply, "{", ",");
            ecs_strbuf_list_append(reply, "\"name\":\"%s\"",
                stats[i].name);

            ecs_strbuf_list_append(reply, "\"entity\":%u",
                stats[i].entity);

            ecs_strbuf_list_append(reply, "\"signature\":\"%s\"",
                stats[i].signature);                

            ecs_strbuf_list_append(reply, "\"is_enabled\":%s",
                stats[i].is_enabled ? "true" : "false");

            ecs_strbuf_list_append(reply, "\"is_active\":%s",
                stats[i].is_active ? "true" : "false");

            ecs_strbuf_list_append(reply, "\"is_hidden\":%s",
                stats[i].is_hidden ? "true" : "false");

            ecs_strbuf_list_append(reply, "\"tables_matched\":%u",
                stats[i].tables_matched_count);

            ecs_strbuf_list_append(reply, "\"entities_matched\":%u",
                stats[i].entities_matched_count);

            ecs_strbuf_list_append(reply, "\"invoked\":%u",
                admin_stats[i].invoke_count);

            ecs_strbuf_list_append(reply, "\"period\":%f",
                stats[i].period_seconds);

            write_admin_stat(reply, &admin_stats[i].time_spent, "time_spent");
            write_admin_stat(reply, &admin_stats[i].time_spent_pct, "time_spent_pct");

            ecs_strbuf_list_pop(reply, "}");
        }
    }
}

static 
void AdminHttpReplySystemOnLoad(ecs_rows_t *rows) {
    write_system_stats(rows, EcsOnLoad);
}

static 
void AdminHttpReplySystemPostLoad(ecs_rows_t *rows) {
    write_system_stats(rows, EcsPostLoad);
}

static 
void AdminHttpReplySystemPreUpdate(ecs_rows_t *rows) {
    write_system_stats(rows, EcsPreUpdate);
}

static 
void AdminHttpReplySystemOnUpdate(ecs_rows_t *rows) {
    write_system_stats(rows, EcsOnUpdate);
}

static 
void AdminHttpReplySystemOnValidate(ecs_rows_t *rows) {
    write_system_stats(rows, EcsOnValidate);
}

static 
void AdminHttpReplySystemPostUpdate(ecs_rows_t *rows) {
    write_system_stats(rows, EcsPostUpdate);
}

static 
void AdminHttpReplySystemPreStore(ecs_rows_t *rows) {
    write_system_stats(rows, EcsPreStore);
}

static
void AdminHttpReplySystemOnStore(ecs_rows_t *rows) {
    write_system_stats(rows, EcsOnStore);
}

static
void AdminHttpReplySystemManual(ecs_rows_t *rows) {
    write_system_stats(rows, EcsManual);
}

static
void AdminHttpReplySystemStats(ecs_rows_t *rows) {
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemOnLoad, 1);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemPostLoad, 2);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemPreUpdate, 3);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemOnUpdate, 4);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemOnValidate, 5);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemPostUpdate, 6);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemPreStore, 7);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemOnStore, 8);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemManual, 9);

    ecs_world_t *world = rows->world;
    ecs_strbuf_t *reply = rows->param;

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"on_load\":[", ",");
    ecs_run(world, AdminHttpReplySystemOnLoad, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"post_load\":[", ",");
    ecs_run(world, AdminHttpReplySystemPostLoad, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"pre_update\":[", ",");
    ecs_run(world, AdminHttpReplySystemPreUpdate, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"on_update\":[", ",");
    ecs_run(world, AdminHttpReplySystemOnUpdate, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"on_validate\":[", ",");
    ecs_run(world, AdminHttpReplySystemOnValidate, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"post_update\":[", ",");
    ecs_run(world, AdminHttpReplySystemPostUpdate, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"pre_store\":[", ",");
    ecs_run(world, AdminHttpReplySystemPreStore, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"on_store\":[", ",");
    ecs_run(world, AdminHttpReplySystemOnStore, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_next(reply);
    ecs_strbuf_list_push(reply, "\"manual\":[", ",");
    ecs_run(world, AdminHttpReplySystemManual, 0, reply);
    ecs_strbuf_list_pop(reply, "]");    
}

static
void AdminHttpReplyComponentStats(ecs_rows_t *rows) {
    ECS_COLUMN(rows, EcsComponentStats, stats, 1);
    ECS_COLUMN(rows, AdminComponentStats, admin_stats, 2);

    ecs_strbuf_t *reply = rows->param;

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        ecs_strbuf_list_next(reply);
        ecs_strbuf_list_push(reply, "{", ",");

        ecs_strbuf_list_append(reply, "\"name\":\"%s\"",
            stats[i].name);

        ecs_strbuf_list_append(reply, "\"entity\":%u",
            stats[i].entity);

        ecs_strbuf_list_append(reply, "\"entity_count\":%d",
            stats[i].entities_count);

        ecs_strbuf_list_append(reply, "\"table_count\":%d",
            stats[i].tables_count);

        write_memory_stat(reply, &admin_stats[i].memory, "memory");

        ecs_strbuf_list_pop(reply, "}");
    }
}

static
void AdminHttpReplyTypeStats(ecs_rows_t *rows) {
    ECS_COLUMN(rows, EcsTypeStats, stats, 1);

    ecs_strbuf_t *reply = rows->param;

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        ecs_strbuf_list_next(reply);
        ecs_strbuf_list_push(reply, "{", ",");
        
        ecs_strbuf_list_append(reply, "\"name\":\"%s\"",
            stats[i].name);

        ecs_strbuf_list_append(reply, "\"entity\":%u",
            stats[i].entity);

        ecs_strbuf_list_append(reply, "\"is_hidden\":%u",
            stats[i].is_hidden);

        ecs_strbuf_list_append(reply, "\"entity_count\":%u",
            stats[i].entities_count + stats[i].entities_childof_count + 
            stats[i].entities_instanceof_count); 

        ecs_strbuf_list_append(reply, "\"component_count\":%u",
            stats[i].components_count);

        ecs_strbuf_list_append(reply, "\"col_system_count\":%u",
            stats[i].col_systems_count); 

        ecs_strbuf_list_append(reply, "\"row_system_count\":%u",
            stats[i].row_systems_count); 

        ecs_strbuf_list_append(reply, "\"enabled_system_count\":%u",
            stats[i].enabled_systems_count);

        ecs_strbuf_list_append(reply, "\"active_system_count\":%u",
            stats[i].active_systems_count);

        ecs_strbuf_list_append(reply, "\"instance_count\":%u",
            stats[i].instance_count);

        ecs_strbuf_list_pop(reply, "}");
    }
}

static
void AdminHttpReply(ecs_rows_t *rows) {
    ECS_COLUMN_ENTITY(rows, AdminHttpReplyWorldStats, 1);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplyMemoryStats, 2);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplySystemStats, 3);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplyComponentStats, 4);
    ECS_COLUMN_ENTITY(rows, AdminHttpReplyTypeStats, 5);
    
    ecs_world_t *world = rows->world;
    ecs_strbuf_t *reply = rows->param;

    ecs_strbuf_list_push(reply, "{", ",");
    ecs_run(world, AdminHttpReplyWorldStats, 0, reply);

    ecs_strbuf_list_appendstr(reply, "\"memory\":");
    ecs_strbuf_list_push(reply, "{", ",");
    ecs_run(world, AdminHttpReplyMemoryStats, 0, reply);
    ecs_strbuf_list_pop(reply, "}");

    ecs_strbuf_list_appendstr(reply, "\"systems\":");
    ecs_strbuf_list_push(reply, "{", ",");    
    ecs_run(world, AdminHttpReplySystemStats, 0, reply);
    ecs_strbuf_list_pop(reply, "}");

    ecs_strbuf_list_appendstr(reply, "\"components\":");
    ecs_strbuf_list_push(reply, "[", ",");
    ecs_run(world, AdminHttpReplyComponentStats, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_appendstr(reply, "\"types\":");
    ecs_strbuf_list_push(reply, "[", ",");
    ecs_run(world, AdminHttpReplyTypeStats, 0, reply);
    ecs_strbuf_list_pop(reply, "]");

    ecs_strbuf_list_pop(reply, "}");
}

void AdminHttpImport(
    ecs_world_t *world,
    int flags)
{
    ECS_MODULE(world, AdminHttp);

    ECS_SYSTEM(world, AdminHttpReplyWorldStats, EcsManual, [in] EcsWorldStats, [in] AdminWorldStats,
        SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminHttpReplyMemoryStats, EcsManual, [in] AdminMemoryStats,
        SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminHttpReplySystemOnLoad, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemPostLoad, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemPreUpdate, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemOnUpdate, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemOnValidate, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemPostUpdate, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemPreStore, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemOnStore, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);
    ECS_SYSTEM(world, AdminHttpReplySystemManual, EcsManual, [in] EcsSystemStats, [in] AdminSystemStats,
        SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminHttpReplySystemStats, EcsManual,
        .AdminHttpReplySystemOnLoad,
        .AdminHttpReplySystemPostLoad,
        .AdminHttpReplySystemPreUpdate,
        .AdminHttpReplySystemOnUpdate,
        .AdminHttpReplySystemOnValidate,
        .AdminHttpReplySystemPostUpdate,
        .AdminHttpReplySystemPreStore,
        .AdminHttpReplySystemOnStore,
        .AdminHttpReplySystemManual,
        SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminHttpReplyComponentStats, EcsManual, [in] EcsComponentStats, [in] AdminComponentStats,
        SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminHttpReplyTypeStats, EcsManual, [in] EcsTypeStats,
        SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminHttpReply, EcsManual,
        .AdminHttpReplyWorldStats,
        .AdminHttpReplyMemoryStats,
        .AdminHttpReplySystemStats,
        .AdminHttpReplyComponentStats,
        .AdminHttpReplyTypeStats,
        SYSTEM.EcsHidden);

    ECS_TYPE(world, AdminHttpReplySystemSystems,
        AdminHttpReplySystemOnLoad,
        AdminHttpReplySystemPostLoad,
        AdminHttpReplySystemPreUpdate,
        AdminHttpReplySystemOnUpdate,
        AdminHttpReplySystemOnValidate,
        AdminHttpReplySystemPostUpdate,
        AdminHttpReplySystemPreStore,
        AdminHttpReplySystemOnStore,
        AdminHttpReplySystemManual);

    ECS_TYPE(world, AdminHttpSystems,
        AdminHttpReplyWorldStats,
        AdminHttpReplyMemoryStats,
        AdminHttpReplySystemSystems,
        AdminHttpReplySystemStats,
        AdminHttpReplyComponentStats,
        AdminHttpReplyTypeStats);

    ecs_add(world, AdminHttpReplySystemSystems, EcsHidden);
    ecs_add(world, AdminHttpSystems, EcsHidden);

    ECS_EXPORT_ENTITY(AdminHttpReply);
    ECS_EXPORT_ENTITY(AdminHttpSystems);
}
