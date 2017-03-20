
const signals = [],
    defineSignal = function(scope, name, init) {
      let signal = new Signal(scope, name, init);
      signals.push(signal);
      return signal.initialize();
    },
    resolveSignals = function() {
      signals.forEach(s => s.initialize());
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
      }
      resolveSignals();
    };

const compositeKeyStore = new Map();

class Signal {
  constructor(scope, name, init) {
    this.scope = scope,
    this.name = name,
    this.init = init;
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
