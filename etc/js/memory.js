
var app_mem = {
  categories_chart: {
    type: 'bar',
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
          "#B53FB5"
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
        'Families',
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
              return (value / 1000) + "KB";
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
          "#254BBF",
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
    toKB(num) {
      return (num / 1000).toFixed(2) + "KB";
    }
  },
  data: function() {
    return { }
  },
  template: `
  <tr>
    <td>{{tableId()}}</td>
    <td>{{table.columns}}</td>
    <td>{{table.row_count}}</td>
    <td>{{toKB(table.memory_used)}}</td>
    <td>{{toKB(table.memory_allocd)}}</td>
  </tr>`
});

Vue.component('app-mem-tables', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>Tables</h2>
      </div>
      <div class="app-large-table-content">
        <table>
          <thead>
            <tr>
              <th>family id</th>
              <th>components</th>
              <th>entities</th>
              <th>memory used</th>
              <th>memory allocated</th>
            </tr>
          </thead>
          <tbody>
            <app-mem-table-row v-for="table in world.tables" :key="table.columns" :table="table">
            </app-mem-table-row>
          </tbody>
        </table>
      </div>
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
      return (num / 1000).toFixed(2) + "KB";
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
  template: `
    <div>
      <h1>Memory</h1>
      <hr>
      <app-mem-data :world="world">
      </app-mem-data>
      <div class="app-graphs">
        <div class="app-left75">
          <app-mem-categories-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-mem-categories-graph>
        </div>
        <div class="app-right25">
          <app-mem-total-graph :world="world" v-on:refresh="$emit('refresh', $event)" v-if="world.fps.length">
          </app-mem-total-graph>
        </div>
      </div>
      <div class="app-mem-tables">
        <app-mem-tables :world="world">
        </app-mem-tables>
      </div>
    </div>`
});
