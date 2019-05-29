#ifndef FLECS_SYSTEMS_ADMIN_H
#define FLECS_SYSTEMS_ADMIN_H

#include <flecs-systems-admin/bake_config.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct EcsAdmin {
    uint16_t port;
} EcsAdmin;

typedef struct FlecsSystemsAdmin {
   ECS_DECLARE_COMPONENT(EcsAdmin);
} FlecsSystemsAdmin;

FLECS_SYSTEMS_ADMIN_EXPORT
void FlecsSystemsAdminImport(
    ecs_world_t *world,
    int flags);

#define FlecsSystemsAdminImportHandles(handles)\
    ECS_IMPORT_COMPONENT(handles, EcsAdmin);

#ifdef __cplusplus
}
#endif

#endif
