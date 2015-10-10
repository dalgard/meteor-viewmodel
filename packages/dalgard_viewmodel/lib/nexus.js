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

    let is_detached = binding.option("detached");


    // Call constructor of Base
    super(view, binding.name);

    // Possibly create nexuses list
    if (!(this.view[ViewModel.bindingsKey] instanceof List))
      this.view[ViewModel.bindingsKey] = new List;


    // Static properties on nexus instance
    defineProperties(this, {
      // Element selector
      selector: { value: selector },

      // Calling context of bind
      context: { value: context },

      // Whether to run the set function when updating
      setPrevented: { value: null, writable: true }
    });

    // Possibly add key to nexus
    if (!is_detached && _.isArray(context.args) && _.isString(context.args[0])) {
      let key = context.args[0];

      defineProperties(this, {
        // Viewmodel key
        key: { value: key }
      });
    }


    // Static properties on context object
    defineProperties(context, {
      // Reference to view
      view: { value: view },

      // Reference to template instance
      templateInstance: { value: templateInstance(view) },

      // Method bound to instance
      preventSet: { value: this.preventSet.bind(this) }
    });

    // Possibly ensure existence of a viewmodel
    if (!is_detached && !(context.viewmodel instanceof ViewModel)) {
      let vm = ViewModel.ensureViewmodel(view, this.key);
      
      defineProperties(context, {
        // Reference to viewmodel
        viewmodel: { value: vm }
      });
    }


    // Add binding resolved with context
    defineProperties(this, {
      // Binding definition
      binding: { value: binding.definition(this.context) }
    });


    // Bind element on view ready
    this.onReady(this.bind);

    // Unbind element on view refreshed
    this.onRefreshed(this.unbind);

    // Unbind element on view destroyed
    this.onDestroyed(this.unbind);
  }

  // Get element
  elem() {
    return $(this.selector);
  }

  // Get viewmodel property
  prop() {
    let vm = this.context.viewmodel,
        has_prop = vm && !_.isUndefined(this.key) && _.isFunction(vm[this.key]);

    return has_prop ? vm[this.key] : null;
  }

  // Bind element
  bind() {
    let $elem = this.elem(),
        binding = this.binding,
        prop = this.prop();


    if (binding.init) {
      // Ensure type of definition property
      check(binding.init, Function);

      let init_value = prop && prop();

      // Run init function immediately
      binding.init.call(this.context, $elem, init_value);
    }


    if (binding.on) {
      // Ensure type of definition property
      check(binding.on, String);

      // Register event listener
      $elem.on(binding.on, event => {
        if (binding.get) {
          // Ensure type of definition property
          check(binding.get, Function);

          let result = binding.get.call(this.context, event, $elem, prop);

          // Call property if get returned a value other than undefined
          if (prop && !_.isUndefined(result)) {
            // Don't trigger set function from updating property
            if (this.setPrevented !== false)
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
      });
    }


    if (binding.set) {
      // Ensure type of definition property
      check(binding.set, Function);
      
      // Wrap set function and add it to list of autoruns
      this.autorun(function () {
        let new_value = prop && prop();

        if (!this.setPrevented)
          binding.set.call(this.context, $elem, new_value);
      });
    }


    // Add to view list
    this.view[ViewModel.bindingsKey].add(this);

    // Add to global list
    Nexus.add(this);
  }

  // Unbind element
  unbind() {
    let do_unbind = this.view.isDestroyed;

    if (!do_unbind) {
      let $elem = this.elem();

      do_unbind = !$elem.length || !document.body.contains($elem[0]);
    }

    // Unbind elements that are no longer part of the DOM
    if (do_unbind) {
      let binding = this.binding,
          prop = this.prop();
      
      if (binding.dispose) {
        // Ensure type of definition property
        check(binding.dispose, Function);

        binding.dispose.call(this.context, prop);
      }


      // Remove from global list
      Nexus.remove(this);

      // Remove from view list
      this.view[ViewModel.bindingsKey].remove(this);
    }

    return do_unbind;
  }

  // Change prevented state of nexus
  preventSet(state = true) {
    // Ensure type of argument
    check(state, Match.OneOf(Boolean, null));

    this.setPrevented = state;
  }
};

// Decorate Nexus class with list methods operating on an internal list
List.decorate(Nexus);
