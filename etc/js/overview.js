
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

var app_overview = {
  fps_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Reflecs ratio',
          data: [],
          backgroundColor: [
            '#296065'
          ],
          borderColor: [
            '#37ABB5',
          ],
          borderWidth: 4
        },
        {
          label: 'FPS',
          data: [],
          backgroundColor: [
            '#40805B', // Green
          ],
          borderColor: [
            '#47B576',
          ],
          borderWidth: 4
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
          id: 'y_fps',
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
  },

  mem_chart: {
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
        label: 'Dataset 1',
        borderWidth: 0
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
  }
}

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
        }
      }
    },
    cssClass() {
      var cl = "";
      if (this.enabled) {
        cl = "app-toggle-true";
      } else {
        cl = "app-toggle-false";
      }
      if (this.in_progress) {
        cl += " app-toggle-in-progress";
      }
      return cl;
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
        {{system.entities_matched}}
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

Vue.component('app-systems-table', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>frame systems</h2>
      </div>
      <div class="app-table-content">
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
              v-for="system in world.systems.on_frame"
              v-if="!system.is_hidden"
              :key="system.id"
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
              v-for="feature in world.features"
              v-if="!feature.is_hidden"
              :key="feature.id"
              :feature="feature"
              v-on:refresh="$emit('refresh', $event)">
            </app-feature-row>
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
              <th>total memory</th>
              <th>in use</th>
              <th>entities</th>
              <th>systems</th>
              <th>tables</th>
              <th>threads</th>
            </tr>
          </thead>
          <tbody v-if="world && world.memory && world.memory.total">
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
      var frame_pct = [];
      for (var i = 0; i < this.world.fps.length; i ++) {
          labels.push(i);
          var fps = this.world.fps[i];
          frame_pct.push(this.world.frame[i] * fps * fps);
      }

      console.log(frame_pct);

      app_overview.fps_chart.data.labels = labels;
      app_overview.fps_chart.data.datasets[1].data = this.world.fps;
      app_overview.fps_chart.data.datasets[0].data = frame_pct;
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
      <canvas id="fps-graph" :data-fps="world.fps"></canvas>
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
      app_overview.mem_chart.data.labels[0] = "Components (" + this.world.memory.components.used / 1000 + "KB)";
      app_overview.mem_chart.data.labels[1] = "Entities (" + this.world.memory.entities.used / 1000 + "KB)";
      app_overview.mem_chart.data.labels[2] = "Systems (" + this.world.memory.systems.used / 1000 + "KB)";
      app_overview.mem_chart.data.labels[3] = "Families (" + this.world.memory.families.used / 1000 + "KB)";
      app_overview.mem_chart.data.labels[4] = "Tables (" + this.world.memory.tables.used / 1000 + "KB)";
      app_overview.mem_chart.data.labels[5] = "Stage (" + this.world.memory.stage.used / 1000 + "KB)";
      app_overview.mem_chart.data.labels[6] = "World (" + this.world.memory.world.used / 1000 + "KB)";
    },
    updateValues() {
      app_overview.mem_chart.data.datasets[0].data = [
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
      <canvas id="mem-graph" :data-memory="this.world.memory"></canvas>
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

Vue.component('app-overview', {
  props: ['world'],
  template: `
    <div>
      <h1>Overview</h1>
      <hr>
      <app-world-data :world="world" v-on:refresh="$emit('refresh', $event)">
      </app-world-data>

      <div class="app-graphs">
        <div class="app-left">
          <app-overview-fps-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-overview-fps-graph>
        </div>
        <div class="app-right">
          <app-overview-mem-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-overview-mem-graph>
        </div>
      </div>

      <div class="app-tables">
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
