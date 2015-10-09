Base = class Base {
  constructor(view, name) {
    check(view, Blaze.View);
    check(name, Match.OneOf(String, null));

    // Static properties on instance
    defineProperties(this, {
      // Reference to view
      view: { value: view },

      // Instance name
      _name: { value: new ReactiveVar(name) }
    });
  }

  // Reactively get or set the name of the instance
  name(name) {
    // Ensure type of argument
    check(name, Match.Optional(String));

    if (_.isString(name))
      this._name.set(name);
    else
      return this._name.get();
  }

  // Run callback when view is rendered and after flush
  onReady(callback) {
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    let view = this.view;

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

    let view = this.view;

    // Wait until the view is rendered and after flush
    this.onReady(function () {
      view.autorun(callback);
    });
  }

  // Run callback when view is refreshed
  onRefreshed(callback) {
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
    check(callback, Function);

    // Bind callback to context
    callback = callback.bind(this);

    this.view.onViewDestroyed(callback);
  }

  // Test this instance with predicate function or by name (string or regex)
  test(test) {
    // Ensure type of argument
    if (_.isRegExp(test))
      return test.test(this.name())
    else if (_.isFunction(test))
      return test(this);

    return test === this.name();
  }

  // Add an instance to the current global list
  static _add(instance) {
    // Ensure type of argument
    check(instance, this);

    let instances = this.__instances,
        is_instances = (instances instanceof ReactiveVar && _.isArray(instances.curValue));

    if (!is_instances) {
      defineProperties(this, {
        // Current global list of instances
        __instances: { value: new ReactiveVar([]) }
      });

      instances = this.__instances;
    }

    instances.curValue.push(instance);
    instances.dep.changed();
  }

  // Remove an instance from the current global list
  static _remove(instance) {
    // Ensure type of argument
    check(instance, this);

    let instances = this.__instances,
        is_instances = (instances instanceof ReactiveVar && _.isArray(instances.curValue)),
        is_found = false;
    
    if (is_instances) {
      let index = instances.curValue.indexOf(instance);

      is_found = !!~index;

      if (is_found) {
        // Remove from instances array
        instances.curValue.splice(index, 1);
        instances.dep.changed();
      }
    }

    return is_found;
  }

  // Reactively get an array of current instances
  static find(name) {
    let instances = this.__instances,
        is_instances = (instances instanceof ReactiveVar && _.isArray(instances.curValue));

    instances = is_instances ? instances.get() : [];

    // Possibly remove instances failing test
    if (name)
      return _.filter(instances, instance => instance.test(name));

    return instances;
  }

  // Reactively get the first current instance at index
  static findOne(name, index) {
    if (_.isNumber(name))
      index = name, name = null;

    return this.find(name).slice(index || 0)[0] || null;
  }
};
