// Whether the bind helper has been registered globally
let is_global = false;


// The {{bind}} Blaze helper
bindHelper = function (...args) {
  let view = Blaze.getView(),
      data = Blaze.getData(),
      hash = args.pop(),  // Keyword arguments
      bind_exps = [];

  // Possibly use hash of Spacebars keywords arguments object
  if (hash instanceof Spacebars.kw)
    hash = hash.hash;

  // Support multiple bind expressions separated by comma
  _.each(args, arg => bind_exps = bind_exps.concat(arg.split(/\s*,\s*/g)));

  // Unique bind id for current element
  let bind_id = uniqueId();


  // Loop through bind expressions
  _.each(bind_exps, exp => {
    // Split bind expression at colon
    exp = exp.trim().split(/\s*:\s*/);

    let args = _.isString(exp[1]) ? exp[1].split(/\s+/g) : [],
        selector = "[" + ViewModel.bindAttrName + "=" + bind_id + "]",
        binding_name = exp[0],
        context = {};

    defineProperties(context, {
      // Current data context
      data: { value: data },

      // Space separated strings after the colon in bind expressions
      args: { value: args },

      // Hash object of Spacebars keyword arguments
      hash: { value: hash }
    });

    // Create binding nexus
    new Nexus(view, selector, binding_name, context);
  });


  // Set the dynamic bind id attribute on the element in order to select it after rendering
  return { [ViewModel.bindAttrName]: bind_id };
};

// Register the bind helper globally and make __helpers reactive
registerHelper = function (name = ViewModel.helperName) {
  // Ensure type of argument
  check(name, String);

  // Global helper
  Template.registerHelper(name, ViewModel.bindHelper);

  // Save name
  ViewModel.helperName = name;

  // Experimental feature: Make the HelperMap of __helpers reactive
  makeHelperMapReactive(Template.body, true);

  // Indicate that the helper has been registered globally
  is_global = true;
}


// Viewmodel declaration hook
viewmodelHook = function (name, definition, options) {
  // Must be called in the context of a template
  if (!(this instanceof Template))
    throw new TypeError("viewmodelHook must be attached to Template.prototype to work");

  // Name argument may be omitted
  if (_.isObject(name))
    options = definition, definition = name, name = this.viewName;

  // Ensure type of arguments
  check(name, String);
  check(definition, Match.OneOf(Object, Function));
  check(options, Match.Optional(Object));


  // If the helper hasn't been registered globally
  if (!is_global) {
    // Register the Blaze bind helper on this template
    this.helpers({
      [ViewModel.helperName]: ViewModel.bindHelper
    });

    // Experimental feature: Make the HelperMap of __helpers reactive
    makeHelperMapReactive(this);
  }


  // Give all instances of this viewmodel the same id (used when sharing state)
  let id = uniqueId();

  // Create viewmodel instance – a function is added to the template's onCreated
  // hook, wherein a viewmodel instance is created on the view with the properties
  // from the definition object
  this.onCreated(function () {
    let vm = this[ViewModel.viewmodelKey];

    // Create new viewmodel instance on view or add properties to existing viewmodel
    if (!(vm instanceof ViewModel)) {
      vm = new ViewModel(this.view, name, id, definition, options);
    }
    else {
      if (name !== this.viewName)
        vm.name(name);

      vm.addProps(definition);
    }
  });
};

// Attach declaration hook to Blaze templates
Template.prototype.viewmodel = viewmodelHook;


// Whether we are in the middle of a hot code push
isHCP = true;

// Hot code push is finished when body is rendered
Template.body.onRendered(() => isHCP = false);


// Add reactivity to HelperMap class or instance
function makeHelperMapReactive(template, use_prototype) {
  // Catch any exceptions, since this is an experimental feature
  try {
    let helpers = template.__helpers,
        prototype = helpers.constructor.prototype,
        helper_map = use_prototype ? prototype : helpers,
        orig_set = prototype.set,
        orig_get = prototype.get,
        orig_has = prototype.has;

    helper_map.set = function (name, helper) {
      if (_.isObject(this.__deps) && this.__deps[name]) {
        this.__deps[name].changed();

        delete this.__deps[name];
      }

      return orig_set.call(this, name, helper);
    };

    helper_map.get = function (name) {
      if (!this.__deps)
        this.__deps = {};

      if (!this.__deps[name])
        this.__deps[name] = new Tracker.Dependency;

      this.__deps[name].depend();

      return orig_get.call(this, name);
    };

    helper_map.has = function (name) {
      this.get(name);

      return orig_has.call(this, name);
    };
  }
  catch (err) {}
}
