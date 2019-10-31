#include <flecs_systems_admin.h>

typedef struct AdminHttp {
    ECS_DECLARE_ENTITY(AdminHttpReply);
    ECS_DECLARE_ENTITY(AdminHttpSystems);
} AdminHttp;

void AdminHttpImport(
    ecs_world_t *world,
    int flags);

#define AdminHttpImportHandles(handles) \
    ECS_IMPORT_ENTITY(handles, AdminHttpReply);\
    ECS_IMPORT_ENTITY(handles, AdminHttpSystems)

