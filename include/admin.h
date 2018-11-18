#ifndef REFLECS_SYSTEMS_ADMIN_H
#define REFLECS_SYSTEMS_ADMIN_H

#include <reflecs/reflecs.h>
#include <reflecs/components/http/http.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct EcsAdmin {
    uint16_t port;
} EcsAdmin;

typedef struct EcsSystemsAdminHandles {
   EcsHandle Admin;
} EcsSystemsAdminHandles;

void EcsSystemsAdmin(
    EcsWorld *world,
    int flags,
    void *handles_out);

#define EcsSystemsAdmin_DeclareHandles(handles)\
    EcsDeclareHandle(handles, Admin);

#ifdef __cplusplus
}
#endif

#endif
