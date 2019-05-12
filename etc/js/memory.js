
var app_mem = {
  toKB: function(num) {
    return (num / 1000).toFixed(2) + "KB";
  },
  categories_chart: {
    type: 'bar',
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
          "#E550E6"
        ],
        borderColor: "black",
        label: 'Used'
      }, {
        data: [1, 1, 1, 1, 1, 1, 1],
        backgroundColor: [
          "#40805B",
          "#296065",
          "#26537F",
          "#273C7F",
          "#3C3366",
          "#482967",
          "#653365"
        ],
        borderColor: "black",
        label: 'Unused'
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
        text: "Categories Used vs. Unused",
        position: "top",
        display: true
      },
      legend: {
        display: false
      },
      responsive: true,
      scales: {
        xAxes: [{
          stacked: true
        }],
        yAxes: [{
          stacked: true,
          gridLines: {
            display: true,
            drawTicks: true,
            color: '#151515'
          },
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return app_mem.toKB(value);
            }
          }
        }]
      },
      maintainAspectRatio: false
    }
  },

  total_chart: {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [1, 1],
        backgroundColor: [
          "#2D5BE6",
          "#273C7F"
        ],
        borderColor: "black",
        label: 'Used',
        borderWidth: 1
      }],
      labels: [
        'Used',
        'Unused'
      ]
    },
    options: {
      title: {
        text: "Total Used vs. Unused",
        position: "top",
        display: true
      },
      legend: {
        display: false
      },
      responsive: true,
      maintainAspectRatio: false
    }
  },

  comp_1min_chart: {
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
        text: "Components (1m)",
        position: "top",
        display: true
      },
      legend: {
        position: "right"
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
                return app_mem.toKB(value);
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
  }
}

Vue.component('app-mem-total-graph', {
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
    updateValues() {
      app_mem.total_chart.data.datasets[0].data = [
        this.world.memory.total.used,
        this.world.memory.total.allocd - this.world.memory.total.used,
      ];
    },
    updateChart() {
      this.updateValues();
      this.chart.update();
    },
    createChart() {
      const ctx = document.getElementById('app-mem-total-graph');

      this.updateValues();

      this.chart = new Chart(ctx, {
        type: app_mem.total_chart.type,
        data: app_mem.total_chart.data,
        options: app_mem.total_chart.options
      });
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="app-mem-total-graph" :data-memory="this.world.memory"></canvas>
    </div>`
});

Vue.component('app-mem-categories-graph', {
  props: ['world'],
  mounted() {
    this.createChart()
  },
  updated() {
    this.updateChart();
  },
  data: function() {
    return {
      chart: undefined
    }
  },
  methods: {
    updateValues() {
      app_mem.categories_chart.data.datasets[0].data = [
        this.world.memory.components.used,
        this.world.memory.entities.used,
        this.world.memory.systems.used,
        this.world.memory.families.used,
        this.world.memory.tables.used,
        this.world.memory.stage.used,
        this.world.memory.world.used
      ];
      app_mem.categories_chart.data.datasets[1].data = [
        this.world.memory.components.allocd - this.world.memory.components.used,
        this.world.memory.entities.allocd - this.world.memory.entities.used,
        this.world.memory.systems.allocd - this.world.memory.systems.used,
        this.world.memory.families.allocd - this.world.memory.families.used,
        this.world.memory.tables.allocd - this.world.memory.tables.used,
        this.world.memory.stage.allocd - this.world.memory.stage.used,
        this.world.memory.world.allocd - this.world.memory.world.used
      ];
    },
    updateChart() {
      this.updateValues();
      this.chart.update();
    },
    createChart() {
      const ctx = document.getElementById('app-mem-categories-graph');

      this.updateValues();

      this.chart = new Chart(ctx, {
        type: app_mem.categories_chart.type,
        data: app_mem.categories_chart.data,
        options: app_mem.categories_chart.options
      });
    }
  },
  template: `
    <div class="app-graph">
      <canvas id="app-mem-categories-graph" :data-memory="this.world.memory">
      </canvas>
    </div>`
});

Vue.component('app-mem-table-row', {
  props: ['world', 'table'],
  methods: {
    columnsString() {
      return shortenText(this.table.columns, 30);
    },
    tableId() {
      if (this.table.id) {
        return this.table.id;
      } else {
        return ""
      }
    },
    tableColumns() {
      return shortenText(this.table.columns);
    }
  },
  data: function() {
    return { }
  },
  template: `
  <tr>
    <td>{{tableId()}}</td>
    <td>{{tableColumns()}}</td>
    <td>{{table.row_count}}</td>
    <td>{{toKB(table.memory_used)}}</td>
    <td>{{toKB(table.memory_allocd)}}</td>
  </tr>`
});

Vue.component('app-mem-comp-table', {
  props: ['world'],
  methods: {
    toKB(num) {
      return (num / 1000).toFixed(2) + "KB";
    },
    last_measurement(component) {
      return component.mem_used_1m[component.mem_used_1m.length - 1];
    }
  },
  template: `
    <div class="app-table">
    <div class="app-table-top">
      <h2>components</h2>
    </div>    
      <div class="app-noscroll-table-content">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>in use</th>
              <th>entities</th>
              <th>tables</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="component in world.components">
            <td>{{component.id}}</td>
            <td>{{toKB(last_measurement(component))}}</td>
            <td>{{component.entities}}</td>
            <td>{{component.tables}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`
})

Vue.component('app-mem-comp-graph', {
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
    avgMem(component) {
      var length = component.mem_used_1m.length;
      var result = 0;

      for (var i = 0; i < length; i ++) {
        result += component.mem_used_1m[i];
      }

      return result / length;
    },
    setValues() {
      var labels = [];
      var components = this.world.components;

      var length = this.world.components[0].mem_used_1m.length;
      for (var i = 0; i < length; i ++) {
          labels.push((length  - i) + "s");
      }

      app_mem.comp_1min_chart.data.labels = labels;

      var dataset = 1;
      for (var i = 0; i < components.length; i ++) {
          var component = components[i];

          if (!app_mem.comp_1min_chart.data.datasets[dataset]) {
            app_mem.comp_1min_chart.data.datasets[dataset] = {
              borderWidth: 0.5,
              pointRadius: 0
            }
          }

          if (this.avgMem(component) < (this.world.memory.total.used / 100)) {
            app_mem.comp_1min_chart.data.datasets[0].label = "Other";
            app_mem.comp_1min_chart.data.datasets[0].data = component.mem_used_1m;
            app_mem.comp_1min_chart.data.datasets[0].borderColor = "#000";
            app_mem.comp_1min_chart.data.datasets[0].backgroundColor = colors[0];
          } else {
            app_mem.comp_1min_chart.data.datasets[dataset].label = component.id;
            app_mem.comp_1min_chart.data.datasets[dataset].data = component.mem_used_1m;
            app_mem.comp_1min_chart.data.datasets[dataset].borderColor = "#000";
            app_mem.comp_1min_chart.data.datasets[dataset].backgroundColor = colors[dataset % colors.length];
            dataset ++;
          }

      }

      app_mem.comp_1min_chart.data.datasets.length = dataset;
    },
    createChart() {
      const ctx = document.getElementById('comp-1min-graph');
      this.setValues();
      this.chart = new Chart(ctx, {
        type: app_mem.comp_1min_chart.type,
        data: app_mem.comp_1min_chart.data,
        options: app_mem.comp_1min_chart.options
      });
    },
    updateChart() {
      this.setValues();
      this.chart.update(0);
    }
  },
  template: `
    <div class="app-graph-fixed">
      <canvas id="comp-1min-graph" :data-fps="world.tick"></canvas>
    </div>`
});

Vue.component('app-mem-data', {
  props: ['world'],
  methods: {
    computeOverhead() {
      var overhead = 100 -
        ((this.world.memory.components.used + this.world.memory.entities.used) /
        this.world.memory.total.allocd) * 100;
      return overhead.toFixed(2) + "%";
    },
    toKB(num) {
      return (num / 1000).toFixed(2) + " KB";
    }
  },
  template: `
    <div class="app-table">
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>total memory</th>
              <th>in use</th>
              <th>components</th>
              <th>entities</th>
              <th>framework overhead</th>
            </tr>
          </thead>
          <tbody v-if="world && world.memory && world.memory.total">
            <td>{{toKB(world.memory.total.allocd)}}</td>
            <td>{{toKB(world.memory.total.used)}}</td>
            <td>{{toKB(world.memory.components.used)}}</td>
            <td>{{toKB(world.memory.entities.used)}}</td>
            <td>{{computeOverhead()}}</td>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-memory', {
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
      <div class="app-row">
        <app-mem-data :world="world">
        </app-mem-data>
      </div>

      <div class="app-fixed-row">
        <div class="app-left75">
          <app-mem-categories-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1m.length">
          </app-mem-categories-graph>
        </div>
        <div class="app-right25">
          <app-mem-total-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.data_1m.length">
          </app-mem-total-graph>
        </div>
      </div>
      <div class="app-row">
        <app-mem-comp-graph :world="world">
        </app-mem-comp-graph>
      </div>      
      <div class="app-row">
        <app-mem-comp-table :world="world">
        </app-mem-comp-table>
      </div>
    </div>`
});
