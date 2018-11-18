var host = "";

var world_state = {
  systems: {},
  tables: {},
  fps: []
}

const chart_data = {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { // another line graph
        label: 'FPS',
        data: [],
        backgroundColor: [
          'rgba(71, 183,132,.0)', // Green
        ],
        borderColor: [
          '#47b784',
        ],
        borderWidth: 3
      }
    ]
  },
  options: {
    responsive: true,
    lineTension: 1,
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          padding: 25,
        }
      }]
    }
  }
}

Vue.component('app-toggle', {
  props: ['text', 'enabled', 'link'],
  methods: {
    clicked() {
      const Http = new XMLHttpRequest();
      const url = "http://" + host + "/" + this.link;
      Http.open("POST", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
          this.$emit('refresh', {});
        }
      }
    }
  },
  template: `
  <div :class="'app-toggle-' + enabled" v-on:click="clicked()">
    {{text}}
  </div>`
});

Vue.component('app-system-row', {
  props: ['world', 'system', 'kind', 'active'],
  methods: {
    enabledColor(enabled) {
      if (enabled) {
        return "#47b784";
      } else {
        return "red";
      }
    },
    activeColor(active) {
      if (active) {
        return "#47b784";
      } else {
        return "orange";
      }
    },
    buttonText(enabled) {
      if (enabled) {
        return "disable";
      } else {
        return "enable";
      }
    }
  },
  data: function() {
    return { }
  },
  template: `
    <tr>
      <td>{{system.id}}</td>
      <td>{{kind}}</td>
      <td>
        <svg height="10" width="10">
          <circle cx="5" cy="5" r="4" stroke-width="0" :fill="enabledColor(system.enabled)"/>
        </svg>
      </td>
      <td>
        <svg height="10" width="10">
          <circle cx="5" cy="5" r="4" stroke-width="0" :fill="activeColor(active)"/>
        </svg>
      </td>
      <td>
        <app-toggle
          :text="buttonText(system.enabled)"
          :enabled="system.enabled"
          :link="'systems/' + system.id + '?enabled=' + !system.enabled"
          v-on:refresh="$emit('refresh', $event)">
        </app-toggle>
      </td>
    </tr>`
});

Vue.component('app-systems', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>Systems</h2>
      </div>
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>id</th><th>kind</th><th>enabled</th><th>active</th><th>toggle</th>
            </tr>
          </thead>
          <tbody>
            <app-system-row
              v-for="system in world.systems.active_systems"
              :key="system.id" :system="system" :kind="'periodic'" :active="true"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.inactive_systems"
              :key="system.id" :system="system" :kind="'periodic'" :active="false"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.on_add_systems"
              :key="system.id" :system="system" :kind="'on add'" :active="true"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.on_set_systems"
              :key="system.id" :system="system" :kind="'on set'" :active="true"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.on_remove_systems"
              :key="system.id" :system="system" :kind="'on remove'" :active="true"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-table-row', {
  props: ['world', 'table'],
  methods: {
    shortenColumns(columns) {
      if (columns.length > 30) {
          columns = columns.slice(0, 30) + "...";
      }
      return columns;
    },
  },
  data: function() {
    return { }
  },
  template: `
  <tr>
    <td>{{shortenColumns(table.columns)}}</td>
    <td>{{table.row_count}}</td>
    <td>{{table.memory_used}}</td>
    <td>{{table.memory_allocd}}</td>
  </tr>`
});

Vue.component('app-tables', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>Tables</h2>
      </div>
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>components</th><th>rows</th><th>memory used</th><th>memory allocated</th>
            </tr>
          </thead>
          <tbody>
            <app-table-row v-for="table in world.tables" :key="table.id" :table="table">
            </app-table-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-world-data', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>memory used</th><th>memory allocated</th><th>table count</th><th>system count</th><th>entity count</th><th>thread count</th>
            </tr>
          </thead>
          <tbody>
            <td>{{world.memory_used}}</td>
            <td>{{world.memory_allocd}}</td>
            <td>{{world.table_count}}</td>
            <td>{{world.system_count}}</td>
            <td>{{world.entity_count}}</td>
            <td>{{world.thread_count}}</td>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-frame-time', {
  props: ['world'],
  mounted() {

    this.createChart()
  },
  data: function() {
    return {
      data: this.world.fps
    }
  },
  methods: {
    createChart() {
      const ctx = document.getElementById('fps-graph');
      var labels = []
      for (var i = 0; i < this.world.fps.length; i ++) {
          labels.push(i);
      }

      chart_data.data.labels = labels;
      chart_data.data.datasets[0].data = this.world.fps;

      const myChart = new Chart(ctx, {
        type: chart_data.type,
        data: chart_data.data,
        options: chart_data.options
      });
    }
  },
  data: function() {
    return { }
  },
  template: `
    <div class="fps">
      <canvas id="fps-graph" height="180px"></canvas>
    </div>`
});

Vue.component('app-world', {
  props: ['world'],
  data: function() {
    return { }
  },
  template: `
    <div class="app-data">
      <div class="app-world">
        <h1>Overview</h1>
        <hr>
        <app-world-data :world="world" v-on:refresh="$emit('refresh', $event)">
        </app-world-data>

        <app-frame-time :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
        </app-frame-time>

        <app-systems :world="world" v-on:refresh="$emit('refresh', $event)">
        </app-systems>

        <!--app-tables :world="world"></app-tables-->
      </div>
    </div>`
});

Vue.component('app-menu-system', {
  props: ['system', 'active'],
  methods: {
    fillColor() {
      if (this.system.enabled) {
          if (this.active) {
              return "#47b784";
          } else {
              return "orange";
          }
      } else {
          return "red";
      }
    }
  },
  data: function() {
    return { }
  },
  template: `
    <div class="app-menu-item">
      <svg height="10" width="10">
        <circle cx="5" cy="5" r="4" stroke-width="0" :fill="fillColor()"/>
      </svg>
      {{system.id}}
    </div>`
});

Vue.component('app-menu', {
  props: ['world'],
  data: function() {
    return {
    }
  },
  template: `
    <div class="app-menu">
      <div class="app-menu-header">Overview</div>

      <div class="app-menu-header">Periodic systems</div>
      <app-menu-system v-for="system in world.systems.active_systems"
        :key="system.id" :system="system" :active="true"> {{system.id}}
      </app-menu-system>
      <app-menu-system v-for="system in world.systems.inactive_systems"
        :key="system.id" :system="system" :active="false"> {{system.id}}
      </app-menu-system>

      <div class="app-menu-header">Reactive systems</div>
      <app-menu-system v-for="system in world.systems.on_add_systems"
        :key="system.id" :system="system" :active="true"> {{system.id}}
      </app-menu-system>
      <app-menu-system v-for="system in world.systems.on_remove_systems"
        :key="system.id" :system="system" :active="true"> {{system.id}}
      </app-menu-system>
      <app-menu-system v-for="system in world.systems.on_set_systems"
        :key="system.id" :system="system" :active="true"> {{system.id}}
      </app-menu-system>

      <div class="app-menu-header">On demand systems</div>
      <app-menu-system v-for="system in world.systems.on_demand_systems"
        :key="system.id" :system="system" :active="true"> {{system.id}}
      </app-menu-system>
    </div>`
});

var app = new Vue({
  el: '#app',

  methods: {
    refresh: function() {
      console.log("REFRESH");
      const Http = new XMLHttpRequest();
      host = this.host;
      const url = "http://" + this.host + "/world"
      Http.open("GET", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
          this.world = JSON.parse(Http.responseText);
        }
      }
    },

    toggle: function(id, enabled) {

    }
  },

  data: {
    host: "localhost:9090",
    world: world_state,
  }
});

window.onload = function() {
  app.refresh();
}
