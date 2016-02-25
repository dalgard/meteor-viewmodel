// Class for viewmodel properties
Property = class Property {
  constructor(vm, key, init_value) {
    // Ensure type of arguments
    check(vm, ViewModel);
    check(key, String);

    const is_primitive = !_.isFunction(init_value);
    const accessor = is_primitive ? this.accessor.bind(this) : init_value.bind(vm);


    // Static properties on property instance
    defineProperties(this, {
      // Property owner
      viewmodel: { value: vm },

      // Property name
      key: { value: key },

      // Reactive value store
      value: { value: new ReactiveVar },

      // Bound accessor method
      accessor: { value: accessor },
    });


    // Property methods bound to instance
    defineProperties(accessor, {
      // Get value
      get: { value: this.get.bind(this) },

      // Set new value
      set: { value: this.set.bind(this) },

      // Reset value
      reset: { value: this.reset.bind(this) },

      // Nonreactive accessor
      nonreactive: { value: this.nonreactive.bind(this) },
    });
    

    if (is_primitive) {
      // Save initial value
      this.initial = init_value;

      // Apply initial value
      this.reset();
    }
  }


  // Get the property value
  get() {
    return this.value.get();
  }

  // Set a new property value
  set(value, share = true) {
    this.value.set(value);

    // Write to other viewmodels if shared
    if (share && this.viewmodel.option("share")) {
      const shared = ViewModel.find(vm => vm._id === this.viewmodel._id);

      _.each(shared, vm => vm[this.key].set(value, false));
    }
  }

  // Reset the value of the property
  reset() {
    // Clone initial value to avoid sharing objects and arrays between instances
    // of the same viewmodel
    this.value.set(_.cloneDeep(this.initial));
  }


  // Reactive accessor function bound to property instance
  accessor(value) {
    if (_.isUndefined(value))
      return this.get();
    else
      this.set(value);
  }

  // Get the value of the property nonreactively
  nonreactive(...args) {
    let accessor = this.accessor.bind(this, ...args);

    return Tracker.nonreactive(accessor);
  }


  // Factory for Blaze property helpers bound to a key
  static helper(key) {
    // Helper function
    const helper = function (...args) {
      const vm = ViewModel.ensureViewmodel(Blaze.getView(), key);

      return vm[key](...args);
    };

    // Mark as viewmodel property helper
    helper.isPropertyHelper = true;

    return helper;
  }
};
