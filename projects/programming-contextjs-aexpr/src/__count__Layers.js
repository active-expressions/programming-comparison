import trigger from 'aexpr-trigger';
  // Implicit layer activation
  activeWhile(aexpr) {
    trigger(aexpr)
      .onBecomeTrue(() => this.beGlobal())
      .onBecomeFalse(() => this.beNotGlobal());
    return this;
  }
