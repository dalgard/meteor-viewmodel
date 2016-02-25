// Class for binding nexuses
Nexus = class Nexus extends Base {
  constructor(view, selector, binding, context = {}) {
    // Ensure type of arguments
    check(selector, Match.OneOf(String, Match.Where(_.isElement)));
    check(binding, Match.OneOf(String, Binding));
    check(context, Object);

    // Possibly get binding
    if (_.isString(binding))
      binding = Binding.get(binding);

    const is_detached = binding.option("detached");

    let key = null;
    let vm = null;
    let prop = null;
    
    // Possibly get key
    if (!is_detached && _.isArray(context.args) && _.isString(context.args[0]))
      key = context.args[0];

    // Possibly ensure existence of a viewmodel
    if (!is_detached && !(context.viewmodel instanceof ViewModel))
      vm = ViewModel.ensureViewmodel(view, key);

    // Possibly get viewmodel property
    if (vm && !_.isUndefined(key) && _.isFunction(vm[key]))
      prop = vm[key];


    // Call constructor of Base
    super(view, binding.name);

    // Possibly create nexuses list
    if (!(this.view[ViewModel.nexusesKey] instanceof List))
      this.view[ViewModel.nexusesKey] = new List;


    // Static properties on context object
    defineProperties(context, {
      // Reference to view
      view: { value: view },

      // Reference to template instance
      templateInstance: { value: templateInstance(view) },

      // Method bound to instance
      preventSet: { value: this.preventSet.bind(this) },

      // Viewmodel key
      key: { value: key },

      // Reference to viewmodel
      viewmodel: { value: vm },
    });


    // Static properties on nexus instance
    defineProperties(this, {
      // Element selector
      selector: { value: selector },

      // Calling context of bind
      context: { value: context },

      // Binding definition resolved with context
      binding: { value: binding.definition(context) },

      // Viewmodel property
      prop: { value: prop },

      // Bound DOM element
      _elem: { value: new ReactiveVar(null) },

      // Whether to run the set function when updating
      _isSetPrevented: { value: new ReactiveVar(null) },
    });


    // Unbind element on view refreshed
    this.onRefreshed(this.unbind);

    // Unbind element on view destroyed
    this.onDestroyed(this.unbind);

    // Unbind element on computation invalidation
    this.onInvalidate(() => this.unbind(true));


    // Bind element on view ready
    this.onReady(this.bind);
  }


  // Reactively get or set the bound DOM element
  elem(elem) {
    // Ensure type of argument
    check(elem, Match.Optional(Match.Where(_.isElement)));

    // Getter
    if (_.isUndefined(elem))
      return this._elem.get();

    this._elem.set(elem);

    // Return element if setter
    return elem;
  }

  // Test the element of this instance or delegate to super
  test(test) {
    // Compare with element
    if (_.isElement(test))
      return test === this.elem();
    
    return super(test);
  }


  // Reactively get or set whether to run the set function when updating
  isSetPrevented(is_set_prevented) {
    // Ensure type of argument
    check(is_set_prevented, Match.Optional(Match.OneOf(Boolean, null)));

    // Getter
    if (_.isUndefined(is_set_prevented))
      return this._isSetPrevented.get();

    this._isSetPrevented.set(is_set_prevented);

    // Return is_set_prevented if setter
    return is_set_prevented;
  }

  // Change prevented state of nexus
  preventSet(state = true) {
    // Ensure type of argument
    check(state, Match.OneOf(Boolean, null));

    this.isSetPrevented(state);
  }


  // Bind element
  bind() {
    const binding = this.binding;
    const prop = this.prop;

    // Get element (possibly set)
    const elem = this.elem() || this.elem(document.querySelector(this.selector));

    // Don't bind if element is no longer present
    if (!Nexus.isInBody(elem))
      return false;


    if (binding.init) {
      // Ensure type of definition property
      check(binding.init, Function);

      const init_value = prop && prop();

      // Run init function immediately
      binding.init.call(this.context, elem, init_value);
    }


    if (binding.on) {
      // Ensure type of definition property
      check(binding.on, Array);

      const listener = event => {
        if (binding.get) {
          // Ensure type of definition property
          check(binding.get, Function);

          const result = binding.get.call(this.context, event, elem, prop);

          // Call property if get returned a value other than undefined
          if (prop && !_.isUndefined(result)) {
            // Don't trigger set function from updating property
            if (this.isSetPrevented() !== false)
              this.preventSet();

            prop.call(this.context.viewmodel, result);
          }
        }
        else if (prop) {
          // Call property if get was omitted in the binding definition
          prop.call(this.context.viewmodel, event, this.context.args, this.context.hash);
        }

        // Mark that we are exiting the update cycle
        Tracker.afterFlush(this.preventSet.bind(this, null));
      };

      // Save listener for unbind
      defineProperties(this, {
        listener: { value: listener },
      });

      // Register event listeners
      _.each(binding.on, type => elem.addEventListener(type, listener));
    }


    if (binding.set) {
      // Ensure type of definition property
      check(binding.set, Function);
      
      // Wrap set function and add it to list of autoruns
      this.autorun(comp => {
        if (comp.firstRun) {
          // Save computation for unbind
          defineProperties(this, {
            comp: { value: comp },
          });
        }

        const new_value = prop && prop();

        if (!this.isSetPrevented())
          binding.set.call(this.context, elem, new_value);
      });
    }


    // Add to view list
    this.view[ViewModel.nexusesKey].add(this);

    // Add to global list
    Nexus.add(this);

    return true;
  }

  // Unbind element
  unbind(do_unbind = this.view.isDestroyed || !Nexus.isInBody(this.elem())) {
    // Unbind elements that are no longer part of the DOM
    if (do_unbind) {
      const binding = this.binding;
      const prop = this.prop;


      // Possibly unregister event listener
      if (this.listener) {
        const elem = this.elem();

        _.each(binding.on, type => elem.removeEventListener(type, this.listener));
      }

      // Possibly stop set autorun
      if (this.comp)
        this.comp.stop();

      
      // Possibly run dispose function
      if (binding.dispose) {
        // Ensure type of definition property
        check(binding.dispose, Function);

        binding.dispose.call(this.context, prop);
      }


      // Remove from global list
      Nexus.remove(this);

      // Remove from view list
      this.view[ViewModel.nexusesKey].remove(this);
    }

    return do_unbind;
  }


  // Whether an element is present in the document body
  static isInBody(elem) {
    // Using the DOM contains method
    return document.body.contains(elem);
  }
};

// Decorate Nexus class with static list methods operating on an internal list
List.decorate(Nexus);
