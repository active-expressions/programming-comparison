
const signals = [],
    adjustedDependencies = [],
    defineSignal = function(scope, name, init, solve) {
      let signal = new Signal(scope, name, init, solve);
      signals.push(signal);
      return signal.initialize();
    },
    resolveSignals = function(starting) {
      let startingIndex = signals.indexOf(starting);
      signals
        .filter((s, i) => i >= startingIndex)
        .forEach(s => {
          if(adjustedDependencies.some((dep) => {
              let scope = dep[0],
                  name = dep[1];
              return s.hasDependency(scope, name);
            })) {
            s.resolve();
            adjustedDependencies.push([s.scope, s.name]);
            s.initialize();
          }
        });
    },
    getLocal = function(scope, name) {
      if(Signal.determineDepencencies) {
        Signal.currentSignal.addDependency(scope, name);
      }
    },
    setLocal = function(scope, name) {
      if(Signal.solving) { return; }
      let triggeredSignal = signals.find(s => s.hasDependency(scope, name));
      if(triggeredSignal) {
        Signal.solving = true;
        adjustedDependencies.length = 0;
        adjustedDependencies.push([scope, name]);
        resolveSignals(triggeredSignal);
        Signal.solving = false;
      }
    };

const compositeKeyStore = new Map();

class Signal {
  constructor(scope, name, init, solve) {
    this.scope = scope,
    this.name = name,
    this.init = init,
    this.solve = solve;
    this.dependencies = new Set();
  }
  initialize() {
    this.dependencies.clear();
    Signal.determineDepencencies = true;
    Signal.currentSignal = this;
    let result = this.init();
    Signal.determineDepencencies = false;
    Signal.currentSignal = undefined;
    return result;
  }
  addDependency(scope, name) {
    this.dependencies.add(CompositeKey.get(scope, name));
  }
  hasDependency(scope, name) {
    return this.dependencies.has(CompositeKey.get(scope, name));
  }
  resolve() {
    this.solve();
  }
}
Signal.currentSignal = undefined;
Signal.determineDepencencies = false;
Signal.solving = false;

class CompositeKey {
    static get(obj1, obj2) {
        if(!compositeKeyStore.has(obj1)) {
            compositeKeyStore.set(obj1, new Map());
        }
        let secondKeyMap = compositeKeyStore.get(obj1);
        if(!secondKeyMap.has(obj2)) {
            secondKeyMap.set(obj2, {});
        }
        return secondKeyMap.get(obj2);
    }
    static clear() {
        compositeKeyStore.clear();
    }
}
