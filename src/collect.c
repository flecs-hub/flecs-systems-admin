#include <flecs_systems_admin.h>
#include "collect.h"

#define MEASUREMENT_COUNT (60)

static
const ecs_vector_params_t double_params = {
    .element_size = sizeof(double)
};

static
ecs_ringbuf_t* init_ringbuf(void)
{
    return ecs_ringbuf_new(&double_params, MEASUREMENT_COUNT);
}

static
void admin_stat_init(
    admin_stat_t *stat)
{
    stat->data_1m = init_ringbuf();
    stat->data_1h = init_ringbuf();
    stat->min_1h = init_ringbuf();
    stat->max_1h = init_ringbuf();
}

static
void admin_memory_stat_init(
    admin_memory_stat_t *stat)
{
    admin_stat_init(&stat->used);
    admin_stat_init(&stat->allocd);
}

/* Utility to push a new measurement to a ringbuffer that loops every hour */
static
void admin_stat_push(
    admin_stat_t *stat,
    double current)
{
    double *value = ecs_ringbuf_push(stat->data_1h, &double_params);
    double *max = ecs_ringbuf_push(stat->max_1h, &double_params);
    double *min = ecs_ringbuf_push(stat->min_1h, &double_params);
    *value = 0;
    *max = current;
    *min = current;
}

/* Utility to add a measurement to a ringbuffer that loops every hour */
static
void admin_stat_add(
    admin_stat_t *stat,
    double current)
{
    uint32_t index = ecs_ringbuf_index(stat->data_1m);

    double *elem = ecs_ringbuf_push(stat->data_1m, &double_params);
    *elem = current;

    stat->current = current;

    if (!(index % MEASUREMENT_COUNT)) {
        admin_stat_push(stat, current);
    }

    double *value = ecs_ringbuf_last(stat->data_1h, &double_params);
    double *max = ecs_ringbuf_last(stat->max_1h, &double_params);
    double *min = ecs_ringbuf_last(stat->min_1h, &double_params);
    *value = (*value * index + current) / (index + 1);
    if (current > *max) *max = current;
    if (current < *min) *min = current;
}

/* Utility to add a memory measurement to ringbuffer that loops every hour */
static
void admin_memory_stat_add(
    admin_memory_stat_t *stat,
    ecs_memory_stat_t *value)
{
    admin_stat_add(&stat->used, value->used_bytes);
    admin_stat_add(&stat->allocd, value->allocd_bytes);
}

static
void AdminAddWorldStats(ecs_rows_t *rows) 
{
    ECS_COLUMN_COMPONENT(rows, AdminWorldStats, 2);
    ecs_set(rows->world, rows->entities[0], AdminWorldStats, {0});

    AdminWorldStats *stat = ecs_get_ptr(
        rows->world, rows->entities[0], AdminWorldStats);

    admin_stat_init(&stat->fps);
    admin_stat_init(&stat->frame);
    admin_stat_init(&stat->system);
    admin_stat_init(&stat->merge);
}

static
void AdminAddMemoryStats(ecs_rows_t *rows) 
{
    ECS_COLUMN_COMPONENT(rows, AdminMemoryStats, 2);

    ecs_set(rows->world, rows->entities[0], AdminMemoryStats, {{{0}}});

    AdminMemoryStats *stat = ecs_get_ptr(
        rows->world, rows->entities[0], AdminMemoryStats);

    admin_memory_stat_init(&stat->total);
    admin_memory_stat_init(&stat->entities);
    admin_memory_stat_init(&stat->components);
    admin_memory_stat_init(&stat->systems);
    admin_memory_stat_init(&stat->types);
    admin_memory_stat_init(&stat->stages);
    admin_memory_stat_init(&stat->tables);
    admin_memory_stat_init(&stat->world);
}

static
void AdminAddSystemStats(ecs_rows_t *rows) 
{
    ECS_COLUMN_COMPONENT(rows, AdminSystemStats, 2);

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        ecs_set(rows->world, rows->entities[i], AdminSystemStats, {0});

        AdminSystemStats *stat = ecs_get_ptr(
            rows->world, rows->entities[i], AdminSystemStats);        

        admin_stat_init(&stat->time_spent);
        admin_stat_init(&stat->time_spent_pct);
    }
}

static
void AdminAddComponentStats(ecs_rows_t *rows) 
{
    ECS_COLUMN_COMPONENT(rows, AdminComponentStats, 2);

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        ecs_set(rows->world, rows->entities[i], AdminComponentStats, {{{0}}});

        AdminComponentStats *stat = ecs_get_ptr(
            rows->world, rows->entities[i], AdminComponentStats);        

        admin_memory_stat_init(&stat->memory);
    }
}

static
void AdminCollectWorldStats(ecs_rows_t *rows) 
{
    ECS_COLUMN(rows, EcsWorldStats, stats, 1);
    ECS_COLUMN(rows, AdminWorldStats, admin_stats, 2);

    double delta_time = rows->delta_time;
    double frame_time_cur = stats->frame_seconds_total - admin_stats->prev_frame_time;
    double system_time_cur = stats->system_seconds_total - admin_stats->prev_system_time;
    double merge_time_cur = stats->merge_seconds_total - admin_stats->prev_merge_time;

    double tick_count = stats->frame_count_total - admin_stats->prev_tick;
    double fps = rows->delta_time
        ? tick_count / rows->delta_time
        : 0
        ;

    double frame_time = (frame_time_cur / delta_time) * 100;
    double system_time = (system_time_cur / delta_time) * 100; 
    double merge_time = (merge_time_cur / delta_time) * 100;

    admin_stat_add(&admin_stats->fps, fps);
    admin_stat_add(&admin_stats->frame, frame_time);
    admin_stat_add(&admin_stats->system, system_time);
    admin_stat_add(&admin_stats->merge, merge_time);

    admin_stats->prev_frame_time = stats->frame_seconds_total;
    admin_stats->prev_system_time = stats->system_seconds_total;
    admin_stats->prev_merge_time = stats->merge_seconds_total;
    admin_stats->prev_tick = stats->frame_count_total;
}

static
void AdminCollectMemoryStats(ecs_rows_t *rows) 
{
    ECS_COLUMN(rows, EcsMemoryStats, stats, 1);
    ECS_COLUMN(rows, AdminMemoryStats, admin_stats, 2);

    admin_memory_stat_add(&admin_stats->total, &stats->total_memory);
    admin_memory_stat_add(&admin_stats->entities, &stats->entities_memory);
    admin_memory_stat_add(&admin_stats->components, &stats->components_memory);
    admin_memory_stat_add(&admin_stats->systems, &stats->systems_memory);
    admin_memory_stat_add(&admin_stats->types, &stats->types_memory);
    admin_memory_stat_add(&admin_stats->stages, &stats->stages_memory);
    admin_memory_stat_add(&admin_stats->tables, &stats->tables_memory);
    admin_memory_stat_add(&admin_stats->world, &stats->world_memory);
}

static
void AdminCollectSystemStats(ecs_rows_t *rows) 
{
    ECS_COLUMN(rows, EcsSystemStats, stats, 1);
    ECS_COLUMN(rows, AdminSystemStats, admin_stats, 2);

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        admin_stats[i].invoke_count = stats[i].invoke_count_total - admin_stats[i].prev_invoke_count_total;
        
        double time_spent = stats[i].seconds_total - admin_stats[i].prev_seconds_total;
        double time_spent_pct = (time_spent / rows->delta_time) * 100;
        admin_stat_add(&admin_stats[i].time_spent, time_spent);
        admin_stat_add(&admin_stats[i].time_spent_pct, time_spent_pct);

        admin_stats[i].prev_seconds_total = stats[i].seconds_total;
        admin_stats[i].prev_invoke_count_total = stats[i].invoke_count_total;
    }
}

static
void AdminCollectComponentStats(ecs_rows_t *rows) 
{
    ECS_COLUMN(rows, EcsComponentStats, stats, 1);
    ECS_COLUMN(rows, AdminComponentStats, admin_stats, 2);

    uint32_t i;
    for (i = 0; i < rows->count; i ++) {
        admin_memory_stat_add(&admin_stats[i].memory, &stats[i].memory);
    }    
}

static
void AdminCollectMetrics(ecs_rows_t *rows) {
    ECS_COLUMN_ENTITY(rows, AdminCollectWorldStats, 1);
    ECS_COLUMN_ENTITY(rows, AdminCollectMemoryStats, 2);
    ECS_COLUMN_ENTITY(rows, AdminCollectSystemStats, 3);
    ECS_COLUMN_ENTITY(rows, AdminCollectComponentStats, 4);

    ecs_world_t *world = rows->world;
    double delta_time = rows->delta_time;
    
    ecs_run(world, AdminCollectWorldStats, delta_time, NULL);
    ecs_run(world, AdminCollectMemoryStats, delta_time, NULL);
    ecs_run(world, AdminCollectSystemStats, delta_time, NULL);
    ecs_run(world, AdminCollectComponentStats, delta_time, NULL);    
}

void AdminCollectImport(
    ecs_world_t *world,
    int flags)
{
    ECS_IMPORT(world, FlecsStats, 0);

    ECS_MODULE(world, AdminCollect);

    ECS_COMPONENT(world, AdminWorldStats);
    ECS_COMPONENT(world, AdminMemoryStats);
    ECS_COMPONENT(world, AdminSystemStats);
    ECS_COMPONENT(world, AdminComponentStats);

    /* Add admin stats components to monitored entities */
    ECS_SYSTEM(world, AdminAddWorldStats, EcsPostLoad, 
        EcsWorldStats, [out] !AdminWorldStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminAddMemoryStats, EcsPostLoad, 
        EcsMemoryStats, [out] !AdminMemoryStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminAddSystemStats, EcsPostLoad, 
        EcsSystemStats, [out] !AdminSystemStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminAddComponentStats, EcsPostLoad, 
        EcsComponentStats, [out] !AdminComponentStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    /* Collect admin metrics */
    ECS_SYSTEM(world, AdminCollectWorldStats, EcsManual,
        [in] EcsWorldStats, [out] AdminWorldStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminCollectMemoryStats, EcsManual,
        [in] EcsMemoryStats, [out] AdminMemoryStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminCollectSystemStats, EcsManual,
        [in] EcsSystemStats, [out] AdminSystemStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    ECS_SYSTEM(world, AdminCollectComponentStats, EcsManual,
        [in] EcsComponentStats, [out] AdminComponentStats,
        SYSTEM.EcsOnDemand, SYSTEM.EcsHidden);

    /* Single system that runs manual collection systems. This way we only need
     * to set the period on this system to control at which period all of the
     * collection systems are ran. */
    ECS_SYSTEM(world, AdminCollectMetrics, EcsOnStore,
        .AdminCollectWorldStats,
        .AdminCollectMemoryStats,
        .AdminCollectSystemStats,
        .AdminCollectComponentStats,
        SYSTEM.EcsHidden);

    /* Run admin metrics collection once per second */
    ecs_set_period(world, AdminCollectMetrics, 1.0);

    /* Store all admin collection systems in a feature so they can be easily
     * enabled/disabled at once */
    ECS_TYPE(world, AdminCollectSystems,
        AdminAddWorldStats,
        AdminAddMemoryStats,
        AdminAddSystemStats,
        AdminAddComponentStats,
        AdminCollectWorldStats,
        AdminCollectMemoryStats,
        AdminCollectSystemStats,
        AdminCollectComponentStats);

    /* Make this a hidden feature as it exposes internals of the module */
    ecs_add(world, AdminCollectSystems, EcsHidden);

    ECS_EXPORT_COMPONENT(AdminWorldStats);    
    ECS_EXPORT_COMPONENT(AdminSystemStats);
    ECS_EXPORT_COMPONENT(AdminComponentStats);
    ECS_EXPORT_ENTITY(AdminCollectSystems);
}