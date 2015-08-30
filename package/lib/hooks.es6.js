Meteor.startup(() => {
  // Restore viewmodel values after a hot code push
  Template.body.onRendered(() => ViewModel._restoreAll());
});


// Declare a viewmodel on a template
Blaze.Template.prototype.viewmodel = function (name, definition, options) {
  // Name argument may be omitted
  if (_.isObject(name))
    options = definition, definition = name, name = null;

  // Give the viewmodel a unique id that is used for sharing
  let id = ViewModel._uniqueId();


  // Create viewmodel instance – a function is added to the template's onCreated
  // hook, wherein a viewmodel instance is created on the view with the properties
  // from the definition object
  this.onCreated(function () {
    let vm = this.viewmodel;

    // Create new viewmodel instance on view or add properties to existing viewmodel
    if (!vm)
      vm = new ViewModel(this.view, id, name, definition, options);
    else
      vm.addProps(definition);

    // Add autoruns
    if (definition.autorun)
      vm.autorun(definition.autorun);
  });


  // Register lifetime hooks with viewmodel as context – the hooks on the
  // viewmodel definition object (created, rendered, destroyed) are registered
  // on the template and gets called with the current viewmodel instance as context
  _.each({
    onCreated: "created",
    onRendered: "rendered",
    onDestroyed: "destroyed"
  }, (name, blaze_hook) => {
    let callbacks = definition[name];

    if (callbacks) {
      this[blaze_hook](function () {
        // Array or single
        if (!_.isArray(callbacks))
          callbacks = [callbacks];

        // Run callbacks with viewmodel as context
        _.each(callbacks, callback => {
          if (!_.isFunction)
            throw new TypeError("The " + name + " hook must be a function or an array of functions");

          callback.call(this.viewmodel)
        });
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
  // {{bind 'binding: key'}} is registered for this template. Elements are bound to
  // the viewmodel through this helper
  if (!ViewModel._isGlobal()) {
    let bind = {};

    bind[ViewModel.helperName] = ViewModel._bindHelper;

    this.helpers(bind);
  }
};
