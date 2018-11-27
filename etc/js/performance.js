
var app_performance = {
  fps_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Systems',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#46D9E6',
          ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'FPS',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#5BE595',
          ],
          borderWidth: 2,
          pointRadius: 0
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
          id: 'y_fps',
          ticks: {
            beginAtZero: true,
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

  sys_1min_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#5BE595' ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#46D9E6' ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#4596E5' ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#2D5BE6' ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#6146E6' ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#9546E5' ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [ '#E550E6' ],
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      title: {
        text: "Systems (1m)",
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
            beginAtZero: true,
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

  fps_1hr_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Systems (min)',
          data: [],
          borderColor: [
            '#46D9E6'
          ],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: 'Systems (max)',
          data: [],
          borderColor: [
            '#296065'
          ],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: 'FPS (min)',
          data: [],
          borderColor: [
            '#5BE595', // Green
          ],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: 'FPS (max)',
          data: [],
          borderColor: [
            '#40805B', // Green
          ],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: 'Systems',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#46D9E6',
          ],
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'FPS',
          data: [],
          backgroundColor: [ 'rgba(0,0,0,0)' ],
          borderColor: [
            '#5BE595',
          ],
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      title: {
        text: "Load (1h)",
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
            beginAtZero: true,
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
        borderWidth: 1
      }],
      labels: [
        'System 1',
        'System 2',
        'System 3',
        'System 4',
        'System 5',
        'System 6',
        'Other'
      ]
    },
    options: {
      title: {
        text: "Systems",
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

Vue.component('app-performance-fps-graph', {
  props: ['world'],
  mounted() {
    this.createChart();
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
      var length = this.world.fps.length;
      for (var i = 0; i < length; i ++) {
          labels.push((length  - i) + "s");
          var fps = this.world.fps[i];
          frame_pct.push(this.world.frame[i] * fps * fps);
      }

      app_performance.fps_chart.data.labels = labels;
      app_performance.fps_chart.data.datasets[1].data = this.world.fps;
      app_performance.fps_chart.data.datasets[0].data = frame_pct;
    },
    createChart() {
      const ctx = document.getElementById('fps-graph');
      this.setValues();
      this.chart = new Chart(ctx, {
        type: app_performance.fps_chart.type,
        data: app_performance.fps_chart.data,
        options: app_performance.fps_chart.options
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

Vue.component('app-performance-fps-1hr-graph', {
  props: ['world'],
  mounted() {
    this.createChart();
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
      var frame_pct_min = [];
      var frame_pct_max = [];

      var length = this.world.fps_1hr.length;
      for (var i = 0; i < length; i ++) {
          labels.push((length - i) + "m");
          var fps = this.world.fps_1hr[i];
          var val = this.world.frame_1hr[i] * fps * fps;
          if (val > fps) val = 0;
          frame_pct.push(val);
          var val = this.world.frame_min_1hr[i] * fps * fps;
          if (val > fps) val = 0;
          frame_pct_min.push(val);
          var val = this.world.frame_max_1hr[i] * fps * fps;
          if (val > fps) val = 0;
          frame_pct_max.push(val);
      }

      app_performance.fps_1hr_chart.data.labels = labels;
      app_performance.fps_1hr_chart.data.datasets[4].data = frame_pct;
      app_performance.fps_1hr_chart.data.datasets[5].data = this.world.fps_1hr;

      app_performance.fps_1hr_chart.data.datasets[0].data = frame_pct_min;
      app_performance.fps_1hr_chart.data.datasets[1].data = frame_pct_max;

      app_performance.fps_1hr_chart.data.datasets[2].data = this.world.fps_min_1hr;
      app_performance.fps_1hr_chart.data.datasets[3].data = this.world.fps_max_1hr;
    },
    createChart() {
      const ctx = document.getElementById('fps-1hr-graph');
      this.setValues();
      this.chart = new Chart(ctx, {
        type: app_performance.fps_1hr_chart.type,
        data: app_performance.fps_1hr_chart.data,
        options: app_performance.fps_1hr_chart.options
      });
    },
    updateChart() {
      this.setValues();
      this.chart.update(0);
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="fps-1hr-graph" :data-fps="world.tick"></canvas>
    </div>`
});

Vue.component('app-performance-sys-1min-graph', {
  props: ['world'],
  mounted() {
    this.createChart();
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
      var length = this.world.systems.on_frame[0].time_spent_1m.length;
      for (var i = 0; i < length; i ++) {
          labels.push((length  - i) + "s");
      }

      app_performance.sys_1min_chart.data.labels = labels;

      for (var i = 0; i < this.world.systems.on_frame.length; i ++) {
          app_performance.sys_1min_chart.data.datasets[i].label = this.world.systems.on_frame[i].id;
          app_performance.sys_1min_chart.data.datasets[i].data = this.world.systems.on_frame[i].time_spent_1m;
          if (i == 6) {
              break;
          }
      }
    },
    createChart() {
      const ctx = document.getElementById('sys-1min-graph');
      this.setValues();
      this.chart = new Chart(ctx, {
        type: app_performance.sys_1min_chart.type,
        data: app_performance.sys_1min_chart.data,
        options: app_performance.sys_1min_chart.options
      });
    },
    updateChart() {
      this.setValues();
      this.chart.update(0);
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="sys-1min-graph" :data-fps="world.tick"></canvas>
    </div>`
});

Vue.component('app-performance-sys-graph', {
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
    sortSystems() {
      var values = [];
      var systems = this.world.systems.on_frame;
      for (var i = 0; i < systems.length; i ++) {
        values.push(systems[i]);
      }

      values.sort(function(a, b) {
        return b.time_spent - a.time_spent;
      });

      return values;
    },
    setLabels(systems) {
      for (var i = 0; i < systems.length; i ++) {
        app_performance.mem_chart.data.labels[i] = systems[i].id;
        if (i == 5) {
          break;
        }
      }
    },
    updateValues(systems) {
      var data = [];
      for (var i = 0; i < systems.length; i ++) {
        data.push(systems[i].time_spent);
        if (i == 5) {
          break;
        }
      }

      data[6] = 0;
      for (var i = 6; i < systems.length; i ++) {
        data[6] += systems[i].time_spent;
      }

      app_performance.mem_chart.data.datasets[0].data = data;
    },
    updateChart() {
      var systems = this.sortSystems();
      this.setLabels(systems);
      this.updateValues(systems);
      this.chart.update();
    },
    createChart() {
      const ctx = document.getElementById('mem-graph');

      var systems = this.sortSystems();
      this.setLabels(systems);
      this.updateValues(systems);

      this.chart = new Chart(ctx, {
        type: app_performance.mem_chart.type,
        data: app_performance.mem_chart.data,
        options: app_performance.mem_chart.options
      });
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="mem-graph" :data-memory="world.tick"></canvas>
    </div>`
});

Vue.component('app-performance-system-row', {
  props: ['world', 'system', 'kind', 'frame'],
  methods: {
    enabledColor() {
      if (this.system.enabled) {
        if (this.system.active) {
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
      if (this.system.enabled) {
        if (this.system.active) {
          return "active";
        } else {
          return "inactive";
        }
      } else {
        return "disabled";
      }
    },
    timeSpent(time) {
      return time.toFixed(2);
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
        <div v-if="system.period != 0">
          {{system.period.toFixed(2)}}s
        </div>
        <div v-else>
          each frame
        </div>
      </td>
      <td>
        {{(100 * system.time_spent / frame).toFixed(2)}}
      </td>
      <td>
        <app-systems-warning :is_hidden="system.is_hidden">
        </app-systems-warning>
        <app-toggle
          :text="buttonText(system.enabled)"
          :enabled="system.enabled"
          :link="'systems/' + system.id + '?enabled=' + !system.enabled"
          v-on:refresh="$emit('refresh', $event)">
        </app-toggle>
      </td>
    </tr>`
});

Vue.component('app-performance-system-table', {
  props: ['world', 'systems'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>periodic systems</h2>
      </div>
      <div class="app-noscroll-table-content">
        <table class="last_align_right">
          <thead>
            <tr>
              <th>id</th>
              <th>period</th>
              <th>% time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-performance-system-row
              v-for="system in systems"
              :key="system.id"
              :system="system"
              :frame="world.frame[world.frame.length - 1] * world.fps[world.fps.length - 1]"
              v-on:refresh="$emit('refresh', $event)">
            </app-performance-system-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-perf-summary', {
  props: ['world'],
  mounted() {
    this.$refs.frame_profiling_input.checked = this.world.frame_profiling;
    this.$refs.system_profiling_input.checked = this.world.system_profiling;
  },
  updated() {
    this.$refs.frame_profiling_input.checked = this.world.frame_profiling;
    this.$refs.system_profiling_input.checked = this.world.system_profiling;
  },
  methods: {
    getLoad() {
      var fps = this.world.fps[this.world.fps.length - 1];
      var frame = this.world.frame[this.world.frame.length - 1];
      return (frame * fps * 100).toFixed(2);
    },
    set_frame_profiling(el) {
      const Http = new XMLHttpRequest();
      const url = "http://" + host + "/world?frame_profiling=" + el.checked;
      Http.open("POST", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
        }
      }
    },
    set_system_profiling(el) {
      const Http = new XMLHttpRequest();
      const url = "http://" + host + "/world?system_profiling=" + el.checked;
      Http.open("POST", url);
      Http.send();
      Http.onreadystatechange = (e)=>{
        if (Http.readyState == 4) {
        }
      }
    }
  },
  template: `
    <div class="app-table">
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>FPS</th>
              <th>Load %</th>
              <th>Periodic systems</th>
              <th>Frame profiling</th>
              <th>System profiling</th>
            </tr>
          </thead>
          <tbody>
            <td>{{(world.fps[world.fps.length - 1]).toFixed(2)}}</td>
            <td>{{getLoad()}}</td>
            <td>{{world.systems.on_frame.length}}</td>
            <td>
              <label class="switch">
                <input type="checkbox"
                  ref="frame_profiling_input"
                  v-on:change="set_frame_profiling($event.target)">
                <span class="slider round"></span>
              </label>
            </td>
            <td>
              <label class="switch">
                <input type="checkbox"
                  ref="system_profiling_input"
                  v-on:change="set_system_profiling($event.target)">
                <span class="slider round"></span>
              </label>
            </td>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-performance', {
  props: ['world'],
  template: `
    <div>
      <h1>Performance</h1>
      <hr>

      <div class="app-row">
        <app-perf-summary :world="world">
        </app-perf-summary>
      </div>

      <div class="app-fixed-row">
        <div class="app-left">
          <app-performance-fps-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-performance-fps-graph>
        </div>
        <div class="app-right">
          <app-performance-fps-1hr-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps_1hr.length">
          </app-performance-fps-1hr-graph>
        </div>
      </div>

      <div class="app-fixed-row">
        <div class="app-left">
          <app-performance-sys-1min-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-performance-sys-1min-graph>
        </div>
        <div class="app-right">
          <app-performance-sys-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-performance-sys-graph>
        </div>
      </div>

      <div class="app-row">
        <app-performance-system-table :world="world"
          :systems="world.systems.on_frame"
          v-on:refresh="$emit('refresh', $event)">
        </app-performance-system-table>
      </div>
    </div>`
});
