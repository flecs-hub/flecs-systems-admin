var host = "";

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
    refresh: function() {
      const Http = new XMLHttpRequest();
      host = this.host;
      const url = "http://" + this.host + "/world"
      Http.open("GET", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
          if (Http.responseText && Http.responseText.length) {
            var prev = this.world.tick;
            if (!prev) prev = 0;
            this.world = JSON.parse(Http.responseText);
            this.world.tick = prev + 1;
          }
        }
      }
    },
    nav: function(event) {
      this.app = event.app;
    }
  },

  data: {
    host: "localhost:9090",
    world: world_state,
    app: 'overview'
  }
});

window.onload = function() {
  app.refresh();
  window.setInterval(app.refresh, 1000);
}
