#include <flecs_systems_admin.h>

/* The AdminHttp module contains only manual systems that create an JSON reply
 * body by walking over entities with statistics information. To create a reply,
 * an application should invoke the AdminHttpReply system. */

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

