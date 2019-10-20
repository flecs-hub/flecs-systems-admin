# flecs-systems-admin
A web dashboard for Flecs

## Getting started
First, make sure you clone and build the required dependencies:

- [flecs.components.http](https://github.com/flecs-hub/flecs-components-http)
- [flecs.systems.civetweb](https://github.com/flecs-hub/flecs-systems-civetweb)

When you are using bake, you can run the following command to install and build all modules:

```
bake clone flecs-hub/flecs-systems-admin
```

### Command line parameter
The easiest way to run the admin is by passing arguments to the commandline. This lets you run the admin for any project without explicitly adding it to the code. For this to work, initialize your Flecs application like this:

```c
ecs_init_w_args(world, argc, argv);
```

When you start your application, add the following arguments:

```
my_app --admin 9090
```

### Enable in code
If you always want to run the admin with your project, you can enable it in code. To do this you need to include the following modules in your project:

- flecs.components.http
- flecs.systems.civetweb
- flecs.systems.admin

If you are using bake, you can simply add these modules to the `"use"` property, like this:

```json
{
    "id": "my_project",
    "type": "application",
    "value": {
        "use": ["flecs.components.http", "flecs.systems.civetweb", "flecs.systems.admin"]
    }
}
```

In your main function, now add the following lines of code:

```c
ecs_world_t *world = ecs_init();

/* Import modules for admin */
ECS_IMPORT(world, FlecsComponentsHttp, 0);
ECS_IMPORT(world, FlecsSystemsCivetweb, 0);
ECS_IMPORT(world, FlecsSystemsAdmin, 0);

/* Create the admin entity */
ecs_set(world, 0, EcsAdmin, {.port = 9090});
```

When you run your project, you should be able to see the admin in `localhost:9090`.

### What if I am not using bake
Currently the admin needs certain features from bake to run. This dependency will be removed in the future, but if you would like to use the admin today without bake, you will have to change the `ut_locate` call to something that tells the code where to find the HTML / JS / CSS files.

## Screenshots
### Overview
![overview](https://user-images.githubusercontent.com/9919222/57315993-0bdf6900-70f5-11e9-9a79-97333370009f.png)

### Performance
![performance](https://user-images.githubusercontent.com/9919222/57316044-36312680-70f5-11e9-9116-561384af581f.png)

### Memory
![memory](https://user-images.githubusercontent.com/9919222/57316115-5bbe3000-70f5-11e9-868d-dbf2a7d89e16.png)

### Systems
![systems](https://user-images.githubusercontent.com/9919222/57316158-70022d00-70f5-11e9-9e21-32497c0cb662.png)

