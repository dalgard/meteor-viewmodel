Blaze.Template.prototype.viewmodel = function (name, definition) {
  // Name argument may be omitted
  if (_.isObject(name)) {
    definition = name;
    name = null;
  }


  // Viewmodel properties
  let props = _.omit(definition, ViewModel._reserved.hooks, ViewModel._reserved.special);

  // Create viewmodel instance – a function is added to the template's onCreated
  // hook, wherein a viewmodel instance is created on the view with the properties
  // from the definition object
  this.onCreated(function () {
    let vm = this.viewmodel;

    // Create new viewmodel instance on view
    if (!vm)
      vm = new ViewModel(this.view, name);

    // Add properties to existing viewmodel
    vm.addProps(props);

    // Add autoruns
    if (definition.autorun)
      vm.autorun(definition.autorun);
  });


  // Register lifetime hooks with viewmodel as context – the hooks on the
  // viewmodel definition object (created, rendered, destroyed) are registered
  // on the template and gets called with the current viewmodel instance as context
  _.each(ViewModel._reserved.hooks, hook => {
    let callbacks = definition[hook];

    if (definition[hook]) {
      // "rendered" -> "onRendered"
      this["on" + hook.charAt(0).toUpperCase() + hook.slice(1)](function () {
        // Array or single
        if (!_.isArray(callbacks))
          callbacks = [callbacks];

        // Run callbacks with viewmodel as context
        _.each(callbacks, callback => callback.call(this.viewmodel));
      });
    }
  });


  let events = definition.events;

  // Make viewmodel the context for events – events on the viewmodel definition
  // object are registered as Blaze events on the template and gets called with
  // the current viewmodel instance as context
  if (events) {
    events = _.mapValues(events, listener => function (...args) {
      let vm = Template.instance().viewmodel;

      listener.call(vm, ...args);
    });

    // Register events
    this.events(events);
  }


  // Register bind helper on templates with a viewmodel – the special Blaze helper
  // {{bind 'type: key'}} is registered for this template. Elements are bound to
  // the viewmodel through this helper
  if (!ViewModel._isGlobal()) {
    let bind = {};

    bind[ViewModel.helperName] = ViewModel._bindHelper;

    this.helpers(bind);
  }
};
