
Vue.component('app-systems-warning', {
  props: ['is_hidden'],
  template: `
    <img src="images/warning.png"
        v-if="is_hidden"
        height="20px"
        style="position:relative;top:6px;left:-5px;display: inline"
        title="This is a hidden system. Hidden systems are often used for internal functionality. Disabling this system may yield unexpected results"/>
`
});

Vue.component('app-systems-reactive-system-row', {
  props: ['world', 'system', 'kind'],
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
    }
  },
  template: `
    <tr>
      <td>
        &nbsp;{{system.id}}
      </td>
      <td>
        {{system.signature}}
      </td>
      <td>
        {{kind}}
      </td>
    </tr>`
});

Vue.component('app-systems-system-row', {
  props: ['world', 'system', 'kind'],
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
    signatureText(sig) {
      return shortenText(sig);
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
        {{signatureText(system.signature)}}
      </td>
      <td>
        {{system.entities_matched}}
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

Vue.component('app-systems-system-table', {
  props: ['world', 'systems', 'kind'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>{{kind}} systems</h2>
      </div>
      <div class="app-noscroll-table-content">
        <table class="last_align_right">
          <thead>
            <tr>
              <th>id</th>
              <th>signature</th>
              <th>entities</th>
              <th>period</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-systems-system-row
              v-for="system in systems"
              :key="system.id"
              :system="system"
              v-on:refresh="$emit('refresh', $event)">
            </app-systems-system-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-systems-reactive-system-table', {
  props: ['world'],
  template: `
    <div class="app-table">
      <div class="app-table-top">
        <h2>reactive systems</h2>
      </div>
      <div class="app-noscroll-table-content">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th></th>
              <th>kind</th>
            </tr>
          </thead>
          <tbody>
            <app-systems-reactive-system-row
              v-for="system in world.systems.on_add"
              :key="system.id"
              :system="system"
              :kind="'on add'"
              v-on:refresh="$emit('refresh', $event)">
            </app-systems-reactive-system-row>
            <app-systems-reactive-system-row
              v-for="system in world.systems.on_set"
              :key="system.id"
              :system="system"
              :kind="'on set'"
              v-on:refresh="$emit('refresh', $event)">
            </app-systems-reactive-system-row>
            <app-systems-reactive-system-row
              v-for="system in world.systems.on_remove"
              :key="system.id"
              :system="system"
              :kind="'on remove'"
              v-on:refresh="$emit('refresh', $event)">
            </app-systems-reactive-system-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-systems-feature-row', {
  props: ['world', 'feature'],
  methods: {
    entitiesString() {
      return shortenText(this.feature.entities, 30);
    },
    enabledColor() {
      if (this.feature.systems_enabled) {
        if (this.feature.systems_enabled == this.feature.system_count) {
          return "#5BE595";
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
        {{feature.entities}}
      </td>
      <td>
        {{feature.systems_enabled}} / {{feature.system_count}}
      </td>
      <td>
        <app-systems-warning :is_hidden="feature.is_hidden">
        </app-systems-warning>
        <app-toggle
          :text="buttonText(this.feature.systems_enabled != 0)"
          :enabled="this.feature.systems_enabled != 0"
          :link="'systems/' + feature.id + '?enabled=' + (this.feature.systems_enabled == 0)"
          v-on:refresh="$emit('refresh', $event)">
        </app-toggle>
      </td>
    </tr>`
});

Vue.component('app-systems-features', {
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
              <th>signature</th>
              <th>enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <app-systems-feature-row
              v-for="feature in world.features"
              :key="feature.id"
              :feature="feature"
              v-on:refresh="$emit('refresh', $event)">
            </app-systems-feature-row>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-system-data', {
  props: ['world'],
  methods: {
    countFwSystems(systems) {
      var result = 0;
      for (var i = 0; i < systems.length; i ++) {
        if (systems[i].is_hidden) {
          result ++;
        }
      }
      return result;
    },
    getFrameworkSystems() {
      var framework_systems = this.countFwSystems(this.world.systems.on_frame);
      framework_systems += this.countFwSystems(this.world.systems.on_demand);
      framework_systems += this.countFwSystems(this.world.systems.on_add);
      framework_systems += this.countFwSystems(this.world.systems.on_set);
      framework_systems += this.countFwSystems(this.world.systems.on_remove);
      return framework_systems;
    },
    getReactiveSystems() {
      return this.world.systems.on_add.length +
          this.world.systems.on_set.length +
          this.world.systems.on_remove.length;
    }
  },
  template: `
    <div class="app-table">
      <div class="app-table-content">
        <table>
          <thead>
            <tr>
              <th>total systems</th>
              <th>hidden systems</th>
              <th>on frame systems</th>
              <th>on demand systems</th>
              <th>reactive systems</th>
            </tr>
          </thead>
          <tbody v-if="world && world.memory && world.memory.total">
            <td>{{world.system_count}}</td>
            <td>{{getFrameworkSystems()}}</td>
            <td>{{world.systems.on_frame.length}}</td>
            <td>{{world.systems.on_demand.length}}</td>
            <td>{{getReactiveSystems()}}</td>
          </tbody>
        </table>
      </div>
    </div>`
});

Vue.component('app-systems', {
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
        <app-system-data :world="world">
        </app-system-data>
      </div>

      <div class="app-row">
        <app-systems-features :world="world">
        </app-systems-features>
      </div>

      <div class="app-row">
        <app-systems-system-table :world="world"
          :systems="world.systems.on_frame"
          :kind="'on frame'"
          v-on:refresh="$emit('refresh', $event)">
        </app-systems-system-table>
      </div>

      <div class="app-row">
        <app-systems-system-table :world="world"
          :systems="world.systems.on_demand"
          :kind="'on demand'"
          v-on:refresh="$emit('refresh', $event)">
        </app-systems-system-table>
      </div>

      <div class="app-row">
        <app-systems-reactive-system-table :world="world"
          v-on:refresh="$emit('refresh', $event)">
        </app-systems-reactive-system-table>
      </div>
    </div>`
});
