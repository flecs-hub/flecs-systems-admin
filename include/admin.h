#ifndef FLECS_SYSTEMS_ADMIN_H
#define FLECS_SYSTEMS_ADMIN_H

#include "bake_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct EcsAdmin {
    uint16_t port;
} EcsAdmin;

typedef struct EcsSystemsAdminHandles {
   ECS_DECLARE_COMPONENT(EcsAdmin);
} EcsSystemsAdminHandles;

void EcsSystemsAdmin(
    EcsWorld *world,
    int flags,
    void *handles_out);

#define EcsSystemsAdmin_ImportHandles(handles)\
    ECS_IMPORT_COMPONENT(handles, EcsAdmin);

#ifdef __cplusplus
}
#endif

#endif
