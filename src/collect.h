#include <flecs_systems_admin.h>

typedef struct admin_stat_t {
    double current;
    ecs_ringbuf_t *data_1m;
    ecs_ringbuf_t *data_1h;
    ecs_ringbuf_t *min_1h;
    ecs_ringbuf_t *max_1h;
} admin_stat_t;

typedef struct admin_memory_stat_t {
    admin_stat_t used;
    admin_stat_t allocd;
} admin_memory_stat_t;

typedef struct AdminWorldStats {
    uint64_t tick;
    admin_stat_t fps;
    admin_stat_t frame;
    admin_stat_t system;
    admin_stat_t merge;

    /* Previous tick */
    double prev_frame_time;
    double prev_system_time;
    double prev_merge_time;
    uint64_t prev_tick;
} AdminWorldStats;

typedef struct AdminMemoryStats {
    admin_memory_stat_t total;
    admin_memory_stat_t entities;
    admin_memory_stat_t components;
    admin_memory_stat_t systems;
    admin_memory_stat_t types;
    admin_memory_stat_t stages;
    admin_memory_stat_t tables;
    admin_memory_stat_t world;
} AdminMemoryStats;

typedef struct AdminSystemStats {
    uint64_t invoke_count;
    admin_stat_t time_spent;
    admin_stat_t time_spent_pct;

    uint64_t prev_invoke_count_total;
    double prev_seconds_total;
} AdminSystemStats;

typedef struct AdminComponentStats {
    admin_memory_stat_t memory;
} AdminComponentStats;

typedef struct AdminCollect {
    ECS_DECLARE_COMPONENT(AdminWorldStats);
    ECS_DECLARE_COMPONENT(AdminMemoryStats);
    ECS_DECLARE_COMPONENT(AdminSystemStats);
    ECS_DECLARE_COMPONENT(AdminComponentStats);
    ECS_DECLARE_ENTITY(AdminCollectSystems);
} AdminCollect;

void AdminCollectImport(
    ecs_world_t *world,
    int flags);

#define AdminCollectImportHandles(handles) \
    ECS_IMPORT_COMPONENT(handles, AdminWorldStats);\
    ECS_IMPORT_COMPONENT(handles, AdminMemoryStats);\
    ECS_IMPORT_COMPONENT(handles, AdminSystemStats);\
    ECS_IMPORT_COMPONENT(handles, AdminComponentStats);\
    ECS_IMPORT_ENTITY(handles, AdminCollectSystems);
