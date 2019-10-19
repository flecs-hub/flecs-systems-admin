var host = "";

var colors = [
    "#B7CB2A",
    "#8DB3CC",
    "#8B2DCA",
    "#5AB7CC",
    "#C28DCC",

    "#5BE595",
    "#46D9E6",
    "#4596E5",
    "#2D5BE6",
    "#6146E6",
    "#9546E5",
    "#E550E6",

    "#40805B",
    "#296065",
    "#26537F",
    "#273C7F",
    "#3C3366",
    "#482967",
];

Vue.component('app-menu', {
  props: ['world', 'app'],
  methods: {
    nav(app) {
      this.$emit('nav', {app: app});
    },
    cssClass(item) {
      var cl = 'app-menu-header';
      if (item == this.app) {
        cl += ' app-menu-header-active';
      }
      return cl;
    }
  },
  template: `
    <div class="app-menu">
      <div :class="cssClass('overview')" @click="nav('overview')">Overview</div>
      <div :class="cssClass('performance')" @click="nav('performance')">Performance</div>
      <div :class="cssClass('memory')" @click="nav('memory')">Memory</div>
      <div :class="cssClass('systems')" @click="nav('systems')">Systems</div>
    </div>`
});

Vue.component('app-data', {
  props: ['world', 'app'],
  data: function() {
    return {
    }
  },
  render: function(h) {
    return h('div', {
      attrs: {class: "app-data"}
    }, [
      h('app-' + this.app, {
        props: {
          world: this.world
        }
      })
    ]);
  }
});

var app = new Vue({
  el: '#app',

  methods: {
    get_system_color(system) {
      return this.system_colors[system.id];
    },
    set_system_array_colors(systems) {
      if (systems) {
        for (var i = 0; i < systems.length; i ++) {
          var system = systems[i];
          var color = this.get_system_color(system);
          if (!color) {
            this.system_colors[system.id] = colors[this.last_color];
            this.last_color = (this.last_color + 1) % colors.length;
          }
        }
      }
    },
    set_system_colors() {
      this.set_system_array_colors(this.world.systems.on_load);
      this.set_system_array_colors(this.world.systems.post_load);
      this.set_system_array_colors(this.world.systems.pre_update);
      this.set_system_array_colors(this.world.systems.on_update);
      this.set_system_array_colors(this.world.systems.on_validate);
      this.set_system_array_colors(this.world.systems.post_update);
      this.set_system_array_colors(this.world.systems.pre_store);
      this.set_system_array_colors(this.world.systems.on_store);
      this.set_system_array_colors(this.world.systems.manual);
    },
    refresh() {
      const Http = new XMLHttpRequest();
      host = this.host;
      const url = "http://" + this.host + "/world";
      Http.open("GET", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
          if (Http.responseText && Http.responseText.length) {
            var prev = this.world.tick;
            if (!prev) prev = 0;
            this.world = JSON.parse(Http.responseText);
            this.world.tick = prev + 1;
            this.set_system_colors();
            this.world.system_colors = this.system_colors;
          }
        }
      }
    },
    nav: function(event) {
      this.app = event.app;
    }
  },

  data: {
    host: window.location.host,
    world: world_state,
    app: 'overview',
    last_color: 0,
    system_colors: {Other: "#E550E6"}
  }
});

window.onload = function() {
  app.refresh();
  window.setInterval(app.refresh, 1000);
}
