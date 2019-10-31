
function shortenText(columns, length) {
  if (columns.length > 80) {
      columns = columns.slice(0, 80) + "...";
  }
  return columns;
}

var world_state = {
  systems: {},
  tables: {},
  fps: {
    data_1m: [],
    data_1h: [],
    min_1h:[],
    max_1h:[]
  },
  memory: {}
}

var app_overview = {
  fps_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'FPS',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#5BE595',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "fps"
        },
        {
          label: 'Systems %',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#46D9E6',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'Merging %',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#E550E6',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'Frame %',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#6146E6',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "pct"
        }
      ]
    },
    options: {
      title: {
        text: "Load (1m)",
        position: "top",
        display: true
      },
      responsive: true,
      maintainAspectRatio: false,
      lineTension: 1,
      scales: {
        yAxes: [{
          id: 'fps',
          ticks: {
            beginAtZero: true,
            padding: 25,
            callback: function(value, index, values) {
                return value + "Hz";
            }
          }
        }, {
          id: 'pct',
          position: 'right',
          ticks: {
            beginAtZero: true,
            padding: 10,
            suggestedMax: 100,
            callback: function(value, index, values) {
                return value + "%";
            }
          }
        }],
        xAxes: [{
          ticks: {
            maxTicksLimit: 20
          }
        }]
      }
    }
  },

  mem_chart: {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [1, 1, 1, 1, 1, 1, 1],
        backgroundColor: [
          "#5BE595",
          "#46D9E6",
          "#4596E5",
          "#2D5BE6",
          "#6146E6",
          "#9546E5",
          "#E550E6",
          "#AA4462"
        ],
        borderColor: "black",
        label: 'Dataset 1',
        borderWidth: 0.5
      }],
      labels: [
        'Components',
        'Entities',
        'Systems',
        'Types',
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
  }
}

Vue.component('app-overview-fps-graph', {
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
      var labels = [];
      var length = this.world.fps.data_1m.length;
      for (var i = 0; i < length; i ++) {
          labels.push((length  - i) + "s");
      }

      app_overview.fps_chart.data.labels = labels;
      app_overview.fps_chart.data.datasets[0].data = this.world.fps.data_1m;
      app_overview.fps_chart.data.datasets[3].data = this.world.frame.data_1m;
      app_overview.fps_chart.data.datasets[1].data = this.world.system.data_1m;
      app_overview.fps_chart.data.datasets[2].data = this.world.merge.data_1m;
    },
    createChart() {
      const ctx = document.getElementById('fps-graph');
      this.setValues();
      this.chart = new Chart(ctx, {
        type: app_overview.fps_chart.type,
        data: app_overview.fps_chart.data,
        options: app_overview.fps_chart.options
      });
    },
    updateChart() {
      this.setValues();
      this.chart.update(0);
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="fps-graph" :data-fps="world.tick"></canvas>
    </div>`
});

Vue.component('app-overview-mem-graph', {
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
      app_overview.mem_chart.data.labels[0] = "Components (" + this.world.memory.components.used.current / 1000 + "KB)";
      app_overview.mem_chart.data.labels[1] = "Entities (" + this.world.memory.entities.used.current / 1000 + "KB)";
      app_overview.mem_chart.data.labels[2] = "Systems (" + this.world.memory.systems.used.current / 1000 + "KB)";
      app_overview.mem_chart.data.labels[3] = "Types (" + this.world.memory.types.used.current / 1000 + "KB)";
      app_overview.mem_chart.data.labels[4] = "Tables (" + this.world.memory.tables.used.current / 1000 + "KB)";
      app_overview.mem_chart.data.labels[5] = "Stage (" + this.world.memory.stages.allocd.current / 1000 + "KB)";
      app_overview.mem_chart.data.labels[6] = "World (" + this.world.memory.world.used.current / 1000 + "KB)";
    },
    updateValues() {
      app_overview.mem_chart.data.datasets[0].data = [
        this.world.memory.components.used.current,
        this.world.memory.entities.used.current,
        this.world.memory.systems.used.current,
        this.world.memory.types.used.current,
        this.world.memory.tables.used.current,
        this.world.memory.stages.allocd.current,
        this.world.memory.world.allocd.current
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
        type: app_overview.mem_chart.type,
        data: app_overview.mem_chart.data,
        options: app_overview.mem_chart.options
      });
    }
  },
  data: function() {
    return { }
  },
  template: `
    <div class="app-graph">
      <canvas id="mem-graph" :data-memory="this.world.tick"></canvas>
    </div>`
});

Vue.component('app-toggle', {
  props: ['enabled', 'link'],
  data: function() {
    return {
      in_progress: false,
      button_state: false
    }
  },
  mounted() {
    this.button_state = this.enabled;
  },
  updated() {
    if (!this.in_progress) {
      this.button_state = this.enabled;
    }
  },
  methods: {
    mousedown() {
      this.in_progress = true;
    },
    clicked() {
      this.button_state = !this.button_state;

      const Http = new XMLHttpRequest();
      const url = "http://" + host + "/" + this.link + "?enabled=" + this.button_state;
      Http.open("POST", url);
      Http.send();
     
      Http.onreadystatechange = (e) => {
        if (Http.readyState == 4) {
          this.in_progress = false;
        }
      }
    },
    cssClass() {
      var cl = "";
      if (this.button_state != this.enabled) {
        cl = "app-toggle-out-of-sync"
      } else {
        if (this.button_state) {
          cl = "app-toggle-true";
        } else {
          cl = "app-toggle-false";
        }
        if (this.in_progress) {
          cl += " app-toggle-in-progress";
        }
      }

      return cl;
    },
    text() {
      if (this.button_state) {
        return "enabled"
      } else {
        return "disabled"
      }
    }
  },
  template: `
    <div :class="'app-toggle ' + cssClass()"
      v-on:click="clicked()"
      v-on:mousedown="mousedown()">
      {{text()}}
    </div>`
});

Vue.component('app-system-row', {
  props: ['world', 'system', 'kind'],
  methods: {
    enabledColor() {
      if (this.system.is_enabled) {
        if (this.system.is_active) {
          return "#5BE595";
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
      if (this.system.is_enabled) {
        if (this.system.is_active) {
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
        &nbsp;{{system.name}}
      </td>
      <td>
        {{system.entities_matched}}
      </td>
      <td>
        <app-toggle
          :text="buttonText(system.is_enabled)"
          :enabled="system.is_enabled"
          :link="'systems/' + system.name"
          v-on:refresh="$emit('refresh', $event)">
        </app-toggle>
      </td>
    </tr>`
});

Vue.component('app-systems-table', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>systems</h2>
      </div>
      <div class="app-noscroll-table-content">
        <table class="last_align_right">
          <thead>
            <tr>
              <th>id</th>
              <th>entities</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-system-row
              v-for="system in world.systems.on_load"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.post_load"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>            
            <app-system-row
              v-for="system in world.systems.pre_update"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.on_update"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.post_update"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.pre_store"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-system-row>
            <app-system-row
              v-for="system in world.systems.on_store"
              v-if="!system.is_hidden"
              :key="system.name"
              :system="system"
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
    systemCount() {
      return this.feature.col_system_count + this.feature.row_system_count;
    },
    enabledColor() {
      if (this.feature.enabled_system_count) {
        if (this.feature.enabled_system_count == this.systemCount()) {
          return "#5BE595";
        } else {
          return "orange";
        }
      } else {
        return "red";
      }
    },
    buttonText() {
      if (this.feature.enabled_system_count) {
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
        &nbsp;{{feature.name}}
      </td>
      <td>
        {{feature.enabled_system_count}} / {{this.systemCount()}}
      </td>
      <td>
        <app-toggle
          :text="buttonText(feature.enabled_system_count != 0)"
          :enabled="feature.enabled_system_count != 0"
          :link="'systems/' + feature.name"
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
      <div class="app-noscroll-table-content">
        <table class="last_align_right">
          <thead>
            <tr>
              <th>id</th>
              <th>enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-feature-row
              v-for="feature in world.types"
              v-if="!feature.is_hidden && (feature.col_system_count || feature.row_system_count)"
              :key="feature.name"
              :feature="feature"
              v-on:refresh="$emit('refresh', $event)">
            </app-feature-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-border', {
  props: ['world'],
  data: function() {
    return { }
  },
  template: `
    <div>
      <div class="app-border-top">
      </div>
      <div class="app-border-left">
      </div>
    </div>`
});

Vue.component('app-world-data', {
  props: ['world'],
  template: `
    <div class="app-row">
      <div class="app-table">
        <div class="app-table-content">
          <table>
            <thead>
              <tr>
                <th>fps</th>
                <th>load</th>
                <th>memory</th>
                <th>entities</th>
                <th>threads</th>
              </tr>
            </thead>
            <tbody v-if="world && world.memory && world.memory.total">
              <td>{{world.fps.current.toFixed(2)}} Hz</td>
              <td>{{world.frame.current.toFixed(2)}}%</td>
              <td>{{(world.memory.total.allocd.current / 1000).toFixed(2)}} KB</td>
              <td>{{world.entity_count}}</td>
              <td>{{world.thread_count}}</td>
            </tbody>
          </table>
        </div>
      </div>
    </div>`
});

Vue.component('app-overview', {
  props: ['world'],
  data: function() {
    return {
        active: false
    }
  },
  mounted() {
    setTimeout(function() {
      this.active = true;
    }.bind(this), 10);
  },
  beforeDestroy() {
    this.active = false;
  },
  template: `
    <div :class="'app app-active-' + active">
      <app-world-data :world="world" v-on:refresh="$emit('refresh', $event)">
      </app-world-data>

      <div class="app-fixed-row">
        <div class="app-left">
          <app-overview-fps-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1m.length">
          </app-overview-fps-graph>
        </div>
        <div class="app-right">
          <app-overview-mem-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1m.length">
          </app-overview-mem-graph>
        </div>
      </div>

      <div class="app-row">
        <div class="app-left">
          <app-features :world="world" v-on:refresh="$emit('refresh', $event)">
          </app-features>
        </div>

        <div class="app-right">
          <app-systems-table :world="world" v-on:refresh="$emit('refresh', $event)">
          </app-systems-table>
        </div>
      </div>
    </div>`
});
