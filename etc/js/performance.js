
var app_performance = {
  sys_1min_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: [ '#5BE595' ],
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
          stacked: true,
          ticks: {
            beginAtZero: true,
            padding: 25,
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

  fps_1hr_chart: {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'FPS',
          data: [],
          borderColor: [
            '#5BE595',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "fps"
        },
        {
          label: 'min',
          data: [],
          borderColor: [
            '#5BE595', // Green
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "fps"
        },
        {
          label: 'max',
          data: [],
          borderColor: [
            '#40805B', // Green
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "fps"
        },

        {
          label: 'Systems',
          data: [],
          borderColor: [
            '#46D9E6',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'min',
          data: [],
          borderColor: [
            '#46D9E6'
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'max',
          data: [],
          borderColor: [
            '#296065'
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "pct"
        },

        {
          label: 'Merging',
          data: [],
          borderColor: [
            '#E550E6',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'min',
          data: [],
          borderColor: [
            '#E550E6'
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'max',
          data: [],
          borderColor: [
            '#653365'
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "pct"
        },

        {
          label: 'Total',
          data: [],
          borderColor: [
            '#6146E6',
          ],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'min',
          data: [],
          borderColor: [
            '#6146E6'
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "pct"
        },
        {
          label: 'max',
          data: [],
          borderColor: [
            '#3C3366'
          ],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: "pct"
        },
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
        data: [ ],
        backgroundColor: [ ],
        borderColor: "black",
        label: 'Dataset 1',
        borderWidth: 0.5
      }],
      labels: [ ]
    },
    options: {
      title: {
        text: "Systems (current)",
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

function systemActivity1m(system) {
  var result = 0;
  var max = 0;
  if (system) {
    for (var i = 0; i < system.time_spent_1m.length; i ++) {
      var time_spent = system.time_spent_1m[i];
      result += time_spent;
      if (time_spent > max) {
        max = time_spent;
      }
    }
  }
  return {total: result, max: max};
}

function getActiveSystems1m(world, include_other = true) {
  var result = [];
  var systems = [];
  if (world.systems.on_load) systems = systems.concat(world.systems.on_load);
  if (world.systems.pre_update) systems = systems.concat(world.systems.pre_update);
  if (world.systems.on_update) systems = systems.concat(world.systems.on_update);
  if (world.systems.post_update) systems = systems.concat(world.systems.post_update);
  if (world.systems.on_store) systems = systems.concat(world.systems.on_store);

  var threshold = 1.0 * systems[0].time_spent_1m.length;
  var other = 0;

  for (var i = 0; i < systems.length; i ++) {
    var system = systems[i];
    var time_spent = systemActivity1m(system);

    if (time_spent.max > 1.0) {
      result.push(system);
    } else {
      other += time_spent.total;
    }
  }

  if (include_other && other) {
    result.push({
      id: "Other",
      time_spent: other
    });
  }

  return result;
}

function getActiveSystemsCurrent(world) {
  var result = [];
  var systems = getActiveSystems1m(world, false);
  var other = 0;

  for (var i = 0; i < systems.length; i ++) {
    result.push(systems[i]);
  }

  return result;
}

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

      var merge = [];
      var merge_min = [];
      var merge_max = [];

      var length = this.world.fps.data_1h.length;

      for (var i = 0; i < length; i ++) {
          labels.push((length - i) + "m");
          var frame = this.world.frame.data_1h[i];
          var system = this.world.system.data_1h[i];
          merge.push(frame - system);

          var frame_min = this.world.frame.min_1h[i];
          var system_min = this.world.system.min_1h[i];
          merge_min.push(frame_min - system_min);

          var frame_max = this.world.frame.max_1h[i];
          var system_max = this.world.system.max_1h[i];
          merge_max.push(frame_max - system_max);
      }

      app_performance.fps_1hr_chart.data.labels = labels;
      app_performance.fps_1hr_chart.data.datasets[0].data = this.world.fps.data_1h;
      app_performance.fps_1hr_chart.data.datasets[1].data = this.world.fps.min_1h;
      app_performance.fps_1hr_chart.data.datasets[2].data = this.world.fps.max_1h;

      app_performance.fps_1hr_chart.data.datasets[3].data = this.world.system.data_1h;
      app_performance.fps_1hr_chart.data.datasets[4].data = this.world.system.min_1h;
      app_performance.fps_1hr_chart.data.datasets[5].data = this.world.system.max_1h;

      app_performance.fps_1hr_chart.data.datasets[6].data = merge;
      app_performance.fps_1hr_chart.data.datasets[7].data = merge_min;
      app_performance.fps_1hr_chart.data.datasets[8].data = merge_max;

      app_performance.fps_1hr_chart.data.datasets[9].data = this.world.frame.data_1h;
      app_performance.fps_1hr_chart.data.datasets[10].data = this.world.frame.min_1h;
      app_performance.fps_1hr_chart.data.datasets[11].data = this.world.frame.max_1h;
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
      var length = this.world.systems.on_update[0].time_spent_1m.length;
      for (var i = 0; i < length; i ++) {
          labels.push((length  - i) + "s");
      }

      app_performance.sys_1min_chart.data.labels = labels;

      var systems = getActiveSystems1m(this.world);

      var dataset = 0;
      for (var i = 0; i < systems.length; i ++) {
          var system = systems[i];

          if (!app_performance.sys_1min_chart.data.datasets[dataset]) {
            app_performance.sys_1min_chart.data.datasets[dataset] = {
              borderWidth: 0.5,
              pointRadius: 0
            }
          }
          app_performance.sys_1min_chart.data.datasets[dataset].label = system.id;
          app_performance.sys_1min_chart.data.datasets[dataset].data = system.time_spent_1m;
          app_performance.sys_1min_chart.data.datasets[dataset].borderColor = "#000";
          app_performance.sys_1min_chart.data.datasets[dataset].backgroundColor = this.world.system_colors[system.id];

          dataset ++;
      }

      app_performance.sys_1min_chart.data.datasets.length = dataset;
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
    setLabels(systems) {
      var labels = []
      for (var i = 0; i < systems.length; i ++) {
         labels.push(systems[i].id);
      }
      app_performance.mem_chart.data.labels = labels;
    },
    updateValues(systems) {
      var data = [];
      var bgColor = [];
      for (var i = 0; i < systems.length; i ++) {
        var system = systems[i];
        data.push(system.time_spent);
        bgColor.push(this.world.system_colors[system.id]);
      }

      app_performance.mem_chart.data.datasets[0].data = data;
      app_performance.mem_chart.data.datasets[0].backgroundColor = bgColor;
    },
    updateChart() {
      var systems = getActiveSystemsCurrent(this.world);
      this.setLabels(systems);
      this.updateValues(systems);
      this.chart.update();
    },
    createChart() {
      const ctx = document.getElementById('mem-graph');

      var systems = getActiveSystemsCurrent(this.world);
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
          *
        </div>
      </td>
      <td>
        {{system.time_spent.toFixed(2)}}%
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
              <th>period</th>
              <th>time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-performance-system-row
              v-for="system in world.systems.on_load"
              :world="world"
              :key="system.id"
              :system="system"
              :frame="world.frame.current * world.fps.current"
              v-on:refresh="$emit('refresh', $event)">
            </app-performance-system-row>
            <app-performance-system-row
              v-for="system in world.systems.pre_update"
              :world="world"
              :key="system.id"
              :system="system"
              :frame="world.frame.current * world.fps.current"
              v-on:refresh="$emit('refresh', $event)">
            </app-performance-system-row>
            <app-performance-system-row
              v-for="system in world.systems.on_update"
              :world="world"
              :key="system.id"
              :system="system"
              :frame="world.frame.current * world.fps.current"
              v-on:refresh="$emit('refresh', $event)">
            </app-performance-system-row>
            <app-performance-system-row
              v-for="system in world.systems.post_update"
              :world="world"
              :key="system.id"
              :system="system"
              :frame="world.frame.current * world.fps.current"
              v-on:refresh="$emit('refresh', $event)">
            </app-performance-system-row>
            <app-performance-system-row
              v-for="system in world.systems.on_store"
              :world="world"
              :key="system.id"
              :system="system"
              :frame="world.frame.current * world.fps.current"
              v-on:refresh="$emit('refresh', $event)">
            </app-performance-system-row>
            <app-performance-system-row
              v-for="system in world.systems.on_demand"
              :world="world"
              :key="system.id"
              :system="system"
              :frame="world.frame.current * world.fps.current"
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
  methods: {
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
              <th>Load</th>
              <th>Systems</th>
              <th>Entities</th>
              <th>Frame profiling</th>
              <th>System profiling</th>
            </tr>
          </thead>
          <tbody>
            <td>{{world.fps.current.toFixed(2)}} Hz</td>
            <td>{{world.frame.current.toFixed(2)}}%</td>
            <td>{{world.system.current.toFixed(2)}}%</td>
            <td>{{world.entity_count}}</td>
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
  data: function() {
    return {
        active: false,
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
      <div class="app-row">
        <app-perf-summary :world="world">
        </app-perf-summary>
      </div>

      <div class="app-fixed-row">
        <div class="app-left">
          <app-overview-fps-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1m.length">
          </app-overview-fps-graph>
        </div>
        <div class="app-right">
          <app-performance-fps-1hr-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1h.length">
          </app-performance-fps-1hr-graph>
        </div>
      </div>

      <div class="app-fixed-row">
        <div class="app-left">
          <app-performance-sys-1min-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.system.data_1h.length">
          </app-performance-sys-1min-graph>
        </div>
        <div class="app-right">
          <app-performance-sys-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1m.length">
          </app-performance-sys-graph>
        </div>
      </div>

      <div class="app-row">
        <app-performance-system-table :world="world"
          :systems="world.systems.on_update"
          v-on:refresh="$emit('refresh', $event)">
        </app-performance-system-table>
      </div>
    </div>`
});
