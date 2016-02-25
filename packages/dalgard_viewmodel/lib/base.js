// Base class for viewmodels and nexuses
Base = class Base {
  constructor(view, name) {
    check(view, Blaze.View);
    check(name, Match.OneOf(String, null));

    // Static properties on instance
    defineProperties(this, {
      // Reference to view
      view: { value: view },

      // Instance name
      _name: { value: new ReactiveVar(name) },
    });
  }


  // Reactively get or set the name of the instance
  name(name) {
    // Ensure type of argument
    check(name, Match.Optional(String));

    // Getter
    if (_.isUndefined(name))
      return this._name.get();

    this._name.set(name);

    // Return name if setter
    return name;
  }

  // Test this instance
  test(test) {
    // Predicate function
    if (_.isFunction(test))
      return test(this);

    // Test regex with name
    if (_.isRegExp(test))
      return test.test(this.name());

    // Compare with name
    if (_.isString(test))
      return test === this.name();

    // Compare with instance
    return test === this;
  }


  // Run callback when view is rendered and after flush
  onReady(callback) {
    // Ensure type of argument
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    const view = this.view;

    if (view.isRendered) {
      if (!view.isDestroyed) {
        Tracker.afterFlush(callback);
      }
    }
    else {
      view.onViewReady(callback);
    }
  }

  // Register one or more autoruns
  autorun(callback) {
    // May be an array of callbacks
    if (_.isArray(callback))
      return _.each(callback, this.autorun, this);

    // Ensure type of argument
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    const view = this.view;

    // Wait until the view is rendered and after flush
    this.onReady(function () {
      view.autorun(callback);
    });
  }

  // Run callback when view is refreshed
  onRefreshed(callback) {
    // Ensure type of argument
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    this.view.onViewReady(function () {
      if (this.renderCount > 1)
        callback();
    });
  }

  // Run callback when view is destroyed
  onDestroyed(callback) {
    // Ensure type of argument
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    this.view.onViewDestroyed(callback);
  }

  // Run callback when the current computation is invalidated
  onInvalidate(callback) {
    // Ensure type of argument
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    const computation = Tracker.currentComputation;

    if (computation)
      computation.onInvalidate(callback);
  }
};
