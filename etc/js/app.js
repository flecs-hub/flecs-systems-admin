var host = "";

function shortenText(columns, length) {
  if (columns.length > 30) {
      columns = columns.slice(0, 30) + "...";
  }
  return columns;
}

var world_state = {
  systems: {},
  tables: {},
  fps: [],
  memory: {}
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
    title: {
      text: "Performance",
      position: "top",
      display: true
    },
    responsive: true,
    maintainAspectRatio: false,
    lineTension: 1,
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: false,
          padding: 25,
        }
      }],
      xAxes: [{
        ticks: {
          maxTicksLimit: 20
        }
      }]
    }
  }
}

var pie_data = {
  type: 'doughnut',
  data: {
    datasets: [{
      data: [1, 1, 1, 1, 1, 1, 1],
      backgroundColor: [
        "#47B576",
        "#37ABB5",
        "#3777B5",
        "#254BBF",
        "#4C37B5",
        "#7537B5",
        "#B53FB5",
        "#AA4462"
      ],
      borderColor: "black",
      label: 'Dataset 1'
    }],
    labels: [
      'Components',
      'Entities',
      'Systems',
      'Families',
      'Tables',
      'Stage',
      'World'
    ]
  },
  options: {
    title: {
      text: "Memory",
      position: "top",
      display: true
    },
    legend: {
      position: "left"
    },
    responsive: true,
    maintainAspectRatio: false
  }
};

Vue.component('app-toggle', {
  props: ['text', 'enabled', 'link'],
  data: function() {
    return {
      in_progress: false
    }
  },
  methods: {
    mousedown() {
      this.in_progress = true;
    },
    clicked() {
      const Http = new XMLHttpRequest();
      const url = "http://" + host + "/" + this.link;
      Http.open("POST", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
          this.in_progress = false;
          this.$emit('refresh', {});
        }
      }
    },
    cssClass() {
      if (this.in_progress) {
        return "app-toggle-in-progress";
      } else {
        if (this.enabled) {
          return "app-toggle-true";
        } else {
          return "app-toggle-false";
        }
      }
    }
  },
  template: `
  <div :class="'app-toggle ' + cssClass()"
    v-on:click="clicked()"
    v-on:mousedown="mousedown()">
    {{text}}
  </div>`
});

Vue.component('app-system-row', {
  props: ['world', 'system', 'kind'],
  methods: {
    enabledColor() {
      if (this.system.enabled) {
        if (this.system.active) {
          return "#47b784";
        } else {
          return "orange";
        }
      } else {
        return "red";
      }
    },
    buttonText(enabled) {
      if (enabled) {
        return "disable";
      } else {
        return "enable";
      }
    },
    statusText() {
      if (this.system.enabled) {
        if (this.system.active) {
          return "active";
        } else {
          return "inactive";
        }
      } else {
        return "disabled";
      }
    }
  },
  template: `
    <tr>
      <td>
        <svg height="10" width="10">
          <circle cx="5" cy="5" r="4" stroke-width="0" :fill="enabledColor()"/>
        </svg>
        &nbsp;{{system.id}}
      </td>
      <td>
        {{system.tables_matched}}
      </td>
      <td>
        {{system.entities_matched}}
      </td>
      <td>
        {{statusText()}}
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
        <h2>periodic systems</h2>
      </div>
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>tables</th>
              <th>entities</th>
              <th>status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-system-row
              v-for="system in world.systems.periodic_systems"
              v-if="!system.is_framework"
              :key="system.id"
              :system="system"
              :kind="'periodic'"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-feature-row', {
  props: ['world', 'feature'],
  methods: {
    entitiesString() {
      return shortenText(this.feature.entities, 30);
    },
    enabledColor() {
      if (this.feature.systems_enabled) {
        if (this.feature.systems_enabled == this.feature.system_count) {
          return "#47b784";
        } else {
          return "orange";
        }
      } else {
        return "red";
      }
    },
    buttonText() {
      if (this.feature.systems_enabled) {
        return "disable";
      } else {
        return "enable";
      }
    }
  },
  template: `
    <tr>
      <td>
        <svg height="10" width="10">
          <circle cx="5" cy="5" r="4" stroke-width="0" :fill="enabledColor()"/>
        </svg>
        &nbsp;{{feature.id}}
      </td>
      <td>
        {{entitiesString()}}
      </td>
      <td>
        {{feature.systems_enabled}} / {{feature.system_count}}
      </td>
      <td>
        <app-toggle
          :text="buttonText(this.feature.systems_enabled != 0)"
          :enabled="this.feature.systems_enabled != 0"
          :link="'systems/' + feature.id + '?enabled=' + (this.feature.systems_enabled == 0)"
          v-on:refresh="$emit('refresh', $event)">
        </app-toggle>
      </td>
    </tr>`
});

Vue.component('app-features', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>features</h2>
      </div>
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>systems</th>
              <th>enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-feature-row
              v-for="feature in world.features"
              v-if="!feature.is_framework"
              :key="feature.id"
              :feature="feature"
              v-on:refresh="$emit('refresh', $event)">
            </app-feature-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-table-row', {
  props: ['world', 'table'],
  methods: {
    columnsString() {
      return shortenText(this.table.columns, 30);
    }
  },
  data: function() {
    return { }
  },
  template: `
  <tr>
    <td>{{shortenText(table.columns, 30)}}</td>
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
              <th>component memory</th>
              <th>total memory</th>
              <th>in use</th>
              <th>entities</th>
              <th>systems</th>
              <th>tables</th>
              <th>threads</th>
            </tr>
          </thead>
          <tbody>
            <td>{{world.memory.components.used / 1000}}KB</td>
            <td>{{world.memory.total.allocd / 1000}}KB</td>
            <td>{{world.memory.total.used / 1000}}KB</td>
            <td>{{world.entity_count}}</td>
            <td>{{world.system_count}}</td>
            <td>{{world.table_count}}</td>
            <td>{{world.thread_count}}</td>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-fps-graph', {
  props: ['world'],
  mounted() {
    this.createChart()
  },
  updated() {
    this.updateChart();
  },
  data: function() {
    return {
      chart: {}
    }
  },
  methods: {
    setValues() {
      var lables = [];
      for (var i = 0; i < this.world.fps.length; i ++) {
          lables.push(i);
      }
      chart_data.data.labels = lables;
      chart_data.data.datasets[0].data = this.world.fps;
    },
    createChart() {
      const ctx = document.getElementById('fps-graph');
      this.setValues();
      this.chart = new Chart(ctx, {
        type: chart_data.type,
        data: chart_data.data,
        options: chart_data.options
      });
    },
    updateChart() {
      this.setValues();
      this.chart.update(0);
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="fps-graph" :data-fps="world.fps"></canvas>
    </div>`
});

Vue.component('app-mem-graph', {
  props: ['world'],
  mounted() {
    this.createChart()
  },
  updated() {
    this.updateChart();
  },
  data: function() {
    return {
      chart: {}
    }
  },
  methods: {
    setLabels() {
      pie_data.data.labels[0] = "Components (" + this.world.memory.components.used / 1000 + "KB)";
      pie_data.data.labels[1] = "Entities (" + this.world.memory.entities.used / 1000 + "KB)";
      pie_data.data.labels[2] = "Systems (" + this.world.memory.systems.used / 1000 + "KB)";
      pie_data.data.labels[3] = "Families (" + this.world.memory.families.used / 1000 + "KB)";
      pie_data.data.labels[4] = "Tables (" + this.world.memory.tables.used / 1000 + "KB)";
      pie_data.data.labels[5] = "Stage (" + this.world.memory.stage.used / 1000 + "KB)";
      pie_data.data.labels[6] = "World (" + this.world.memory.world.used / 1000 + "KB)";
    },
    updateValues() {
      pie_data.data.datasets[0].data = [
        this.world.memory.components.used,
        this.world.memory.entities.used,
        this.world.memory.systems.used,
        this.world.memory.families.used,
        this.world.memory.tables.used,
        this.world.memory.stage.allocd,
        this.world.memory.world.allocd
      ];
    },
    updateChart() {
      this.updateValues();
      this.setLabels();
      this.chart.update();
    },
    createChart() {
      const ctx = document.getElementById('mem-graph');

      this.updateValues();
      this.setLabels();

      this.chart = new Chart(ctx, {
        type: pie_data.type,
        data: pie_data.data,
        options: pie_data.options
      });
    }
  },
  data: function() {
    return { }
  },
  template: `
    <div class="app-graph">
      <canvas id="mem-graph" :data-memory="this.world.memory"></canvas>
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

        <div class="app-graphs">
          <div class="app-left">
            <app-fps-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
            </app-fps-graph>
          </div>
          <div class="app-right">
            <app-mem-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
            </app-mem-graph>
          </div>
        </div>

        <app-features :world="world" v-on:refresh="$emit('refresh', $event)">
        </app-features>

        <app-systems :world="world" v-on:refresh="$emit('refresh', $event)">
        </app-systems>

        <!--app-tables :world="world"></app-tables-->
      </div>
    </div>`
});

Vue.component('app-menu-feature', {
  props: ['feature'],
  methods: {
    fillColor() {
      if (this.feature.system_count == this.feature.systems_enabled) {
          return "#47b784";
      } else {
          return "red";
      }
    }
  },
  data: function() {
    return { }
  },
  template: `
    <div v-if="!feature.is_framework">
      <div class="app-menu-item">
        <svg height="10" width="10">
          <circle cx="5" cy="5" r="4" stroke-width="0" :fill="fillColor()"/>
        </svg>
        {{feature.id}}
      </div>
    </div>`
});

Vue.component('app-menu-system', {
  props: ['system'],
  methods: {
    fillColor() {
      if (this.system.enabled) {
          if (this.system.active) {
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
    <div v-if="!system.is_framework">
      <div class="app-menu-item">
        <svg height="10" width="10">
          <circle cx="5" cy="5" r="4" stroke-width="0" :fill="fillColor()"/>
        </svg>
        {{system.id}}
      </div>
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

      <div class="app-menu-header">Features</div>
      <app-menu-feature v-for="feature in world.features"
        :key="feature.id" :feature="feature"> {{feature.id}}
      </app-menu-feature>
      <div class="app-menu-header">Periodic systems</div>
      <app-menu-system v-for="system in world.systems.periodic_systems"
        :key="system.id" :system="system"> {{system.id}}
      </app-menu-system>
      <div class="app-menu-header">Reactive systems</div>
      <app-menu-system v-for="system in world.systems.on_add_systems"
        :key="system.id" :system="system"> {{system.id}}
      </app-menu-system>
      <app-menu-system v-for="system in world.systems.on_remove_systems"
        :key="system.id" :system="system"> {{system.id}}
      </app-menu-system>
      <app-menu-system v-for="system in world.systems.on_set_systems"
        :key="system.id" :system="system"> {{system.id}}
      </app-menu-system>

      <div class="app-menu-header">On demand systems</div>
      <app-menu-system v-for="system in world.systems.on_demand_systems"
        :key="system.id" :system="system"> {{system.id}}
      </app-menu-system>
    </div>`
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
            this.world = JSON.parse(Http.responseText);
          }
        }
      }
    }
  },

  data: {
    host: "localhost:9090",
    world: world_state,
  }
});

window.onload = function() {
  app.refresh();
  window.setInterval(app.refresh, 1000);
}
