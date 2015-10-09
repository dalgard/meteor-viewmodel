// Counter for unique ids
let uid = 0;

// Whether the bind helper has been registered globally
let is_global = false;

// Whether we are in the middle of a hot code push
is_hcp = true;

// ReactiveDict for persistence after hot code push and across re-rendering
let persist = new ReactiveDict("dalgard:viewmodel");


// Exported class
ViewModel = class ViewModel extends Base {
  constructor(view, name = view.name, id = ViewModel.uniqueId(), definition, options) {
    // Ensure type of arguments
    check(id, Match.Integer);
    check(definition, Match.Optional(Match.OneOf(Object, Function)));
    check(options, Match.Optional(Object));

    if (!(view.template instanceof Template))
      throw new TypeError("The view passed to ViewModel must be a template view");

    // Call constructor of Base
    super(view, name, options);


    // Static properties on instance
    defineProperties(this, {
      // Viewmodel id
      _id: { value: id },

      // List of child viewmodels
      _children: { value: new ReactiveVar([]) },

      // Configuration options
      _options: { value: new ReactiveMap(options) }
    });

    // Possibly add properties
    if (definition)
      this.addProps(definition);

    // Attach to template instance
    this.templateInstance()[ViewModel.viewmodelKey] = this;


    // Get parent for non-transcluded viewmodels
    let parent = this.parent();

    // Possibly register with parent
    if (parent)
      parent._addChild(this);

    // Add to global list
    ViewModel._add(this);

    // Tear down viewmodel
    this.onDestroyed(function () {
      // Remove from global list
      ViewModel._remove(this);

      // Possibly remove from parent
      if (parent)
        parent._removeChild(this);
    });


    let hash_id = this.hashId(true),
        is_hcp_restore = ViewModel.restoreAfterHCP && is_hcp;

    // Possibly restore viewmodel instance from the last time the template was rendered
    // or after a hot code push
    if (this._isPersisted() || is_hcp_restore)
      this._restore(hash_id);

    // Always save viewmodel state so it can be restored after a hot code push
    this.autorun(function (comp) {
      // Always register dependencies
      let map = this.serialize();

      // Wait for actual changes to arrive
      if (!comp.firstRun)
        persist.set(hash_id, map);
    });

    // Remove viewmodel from store if not persisted
    this.onDestroyed(function () {
      if (!this._isPersisted())
        delete persist.keys[hash_id];
    });
  }

  // Reactively get or set configuration options
  option(key, value) {
    // Ensure type of argument
    check(key, String);

    if (!_.isUndefined(value))
      this._options.set(key, value);
    else
      return this._options.get(key);
  }

  // Add properties to the viewmodel
  addProps(definition) {
    // Ensure type of argument
    check(definition, Match.Optional(Match.OneOf(Object, Function)));

    // Definition may be a factory
    if (_.isFunction(definition))
      definition = definition.call(this, this.getData());

    if (!_.isObject(definition))
      return;

    // Add autoruns
    if (definition.autorun) {
      this.autorun(definition.autorun);

      delete definition.autorun;
    }

    let template = this.templateInstance().view.template;

    _.each(definition, (init_value, key) => {
      let property = new Property(this, key, init_value);

      // Save accessor as viewmodel property
      this[key] = property.accessor;

      // Register Blaze helper
      template.helpers({ [key]: property.helper });
    });
  }

  // Bind an element
  bind(selector, binding, ...args) {
    // Ensure type of argument
    check(context, Object);

    let context = {};

    defineProperties(context, {
      // Reference to viewmodel
      viewmodel: { value: this },

      // Data context of template instance
      data: { value: this.getData() },

      // Arguments for binding
      args: { value: args }
    });

    // Create binding nexus
    new Nexus(this.view, selector, binding, context);
  }


  // Reactively get template instance
  templateInstance() {
    return this.view.templateInstance();
  }

  // Reactively get the template's data context
  getData() {
    return this.templateInstance().data;
  }


  // Get a hash based on the position of the viewmodel in the view hierarchy,
  // the index of the viewmodel in relation to sibling viewmodels, and, optionally,
  // the current browser location
  hashId(use_path) {
    let path = use_path ? getPath() : "",
        parent = this.parent(),
        index = parent ? _.indexOf(parent.children(), this) : "",
        parent_hash_id = parent ? parent.hashId() : "",
        view_names = [],
        view = this.view;

    do view_names.push(view.name);
    while (view = view.parentView && !view.templateInstance()[ViewModel.viewmodelKey]);

    return SHA256(path + index + view_names.join("/") + parent_hash_id);
  }

  // Reactively get properties for serialization
  serialize() {
    return _.mapValues(this, prop => prop.get());
  }

  // Restore serialized values
  deserialize(map) {
    // Ensure type of argument
    check(map, Match.Optional(Object));

    _.each(map, (value, key) => {
      // Set value on viewmodel or create missing property with value
      if (_.isFunction(this[key]))
        this[key].set(value);
      else
        this.addProps({ [key]: value });
    });
  }

  // Check whether this viewmodel or any ancestor is persisted across re-rendering
  _isPersisted() {
    let persist = this.option("persist");

    if (!persist) {
      let parent = this.parent();

      persist = parent && parent._isPersisted();
    }

    return persist;
  }

  // Restore persisted viewmodel values to instance
  _restore(hash_id = this.hashId(true)) {
    // Ensure type of argument
    check(hash_id, String);

    // Get non-reactively
    let map = persist.keys[hash_id];

    if (_.isString(map))
      map = EJSON.parse(map);

    this.deserialize(map);
  }

  // Reset all properties to their initial value
  reset() {
    _.each(this, prop => prop.reset());
  }


  // Reactively add a child viewmodel to the _children list
  _addChild(vm) {
    // Ensure type of argument
    check(vm, ViewModel);

    this._children.curValue.push(vm);
    this._children.dep.changed();
  }

  // Reactively remove a child viewmodel from the _children list
  _removeChild(vm) {
    // Ensure type of argument
    check(vm, ViewModel);

    let index = this._children.curValue.indexOf(vm);

    // Remove from array
    this._children.curValue.splice(index, 1);
    this._children.dep.changed();
  }

  // Reactively get an array of ancestor viewmodels, optionally within a depth
  // and filtered by name
  ancestors(name, depth) {
    // Name argument may be omitted or replaced by null
    if (_.isNumber(name))
      depth = name, name = null;

    if (!_.isNumber(depth))
      depth = Infinity;

    let ancestors = [];

    if (depth > 0) {
      let parent = this.parent();

      if (parent) {
        ancestors.push(parent);

        ancestors = ancestors.concat(parent.ancestors(depth - 1));
      }
    }

    // Possibly remove results with the wrong name
    if (name)
      return _.filter(ancestors, ancestor => ancestor.test(name));

    return ancestors;
  }

  // Reactively get a single descendant viewmodel, optionally within a depth,
  // at an index, and filtered by name
  ancestor(name, index, depth) {
    // Name argument may be omitted or replaced by null
    if (_.isNumber(name))
      depth = index, index = name, name = null;

    return this.ancestors(name, depth)[index || 0] || null;
  }

  // Reactively get the parent viewmodel, optionally filtered by name
  parent(name) {
    // Transcluded viewmodels have no ancestors
    if (this.option("transclude"))
      return null;

    let parent_view = this.view.parentView;

    do if (parent_view.template) {
      let vm = parent_view.templateInstance()[ViewModel.viewmodelKey];

      if (vm && !vm.option("transclude"))
        return !name || vm.test(name) ? vm : null;
    }
    while (parent_view = parent_view.parentView);

    return null;
  }

  // Reactively get an array of child viewmodels, optionally filtered by name
  children(name) {
    let children = this._children.get();

    // Possibly remove results with the wrong name and return result
    if (name)
      return _.filter(children, child => child.test(name));

    // Always return a copy of the internal array
    return children.slice();
  }

  // Reactively get a single child viewmodel, optionally at an index and filtered by name
  child(name, index) {
    // Name argument may be omitted or replaced by null
    if (_.isNumber(name))
      index = name, name = null;

    return this.children(name)[index || 0] || null;
  }

  // Reactively get an array of descendant viewmodels, optionally within a depth
  // and filtered by name
  descendants(name, depth) {
    // Name argument may be omitted or replaced by null
    if (_.isNumber(name))
      depth = name, name = null;

    if (!_.isNumber(depth))
      depth = Infinity;

    let descendants = [];

    if (depth > 0) {
      _.each(this.children(), child => {
        descendants.push(child);

        descendants = descendants.concat(child.descendants(depth - 1));
      });
    }

    // Possibly remove results with the wrong name
    if (name)
      return _.filter(descendants, descendant => descendant.test(name));

    return descendants;
  }

  // Reactively get a single descendant viewmodel, optionally within a depth,
  // at an index, and filtered by name
  descendant(name, index, depth) {
    // Name argument may be omitted or replaced by null
    if (_.isNumber(name))
      depth = index, index = name, name = null;

    return this.descendants(name, depth)[index || 0] || null;
  }


  // Get next unique id
  static uniqueId() {
    return ++uid;
  };

  // Add a binding to the global list
  static addBinding(...args) {
    Binding.add(...args);
  }


  // Reactively get an array of serialized current viewmodels, optionally filtered by name
  static serialize(name) {
    let viewmodels = this.find(name);

    return _.map(viewmodels, vm => vm.serialize());
  }

  // Restore an array of serialized values on the current viewmodels, optionally filtered by name
  static deserialize(maps, name) {
    // Ensure type of argument
    check(maps, Array);

    let viewmodels = this.find(name);

    _.each(viewmodels, (vm, index) => vm.deserialize(maps[index]));
  }


  // Ensure existence of a viewmodel with optional property
  static _ensureViewmodel(view, key) {
    // Ensure type of arguments
    check(view, Blaze.View);
    check(key, Match.Optional(String));

    let template_instance = templateInstance(view),
        vm = template_instance[ViewModel.viewmodelKey];

    // Possibly create new viewmodel instance on view
    if (!(vm instanceof ViewModel))
      vm = new ViewModel(template_instance.view);

    // Possibly create missing property on viewmodel
    if (_.isString(key) && !_.isFunction(vm[key])) {
      // Initialize as undefined
      let definition = _.zipObject([key]);

      vm.addProps(definition);
    }

    return vm;
  }

  // The {{bind}} Blaze helper
  static bindHelper(...args) {
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
    let bind_id = ViewModel.uniqueId();


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
  }

  // Register the bind helper globally and make __helpers reactive
  static registerHelper(name = ViewModel.helperName) {
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
  static viewmodelHook(name, definition, options) {
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
    let id = ViewModel.uniqueId();

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
  }
};

// Static properties on class
defineProperties(ViewModel, {
  // Name of bind helper
  helperName: { value: "bind", writable: true, enumerable: true },

  // Name of attribute used by bind helper
  bindAttrName: { value: "vm-bind-id", writable: true, enumerable: true },

  // Name of bindings reference on views
  bindingsKey: { value: "bindings", writable: true, enumerable: true },

  // Name of viewmodel reference on template instances
  viewmodelKey: { value: "viewmodel", writable: true, enumerable: true },

  // Whether to try to restore viewmodels in this project after a hot code push
  restoreAfterHCP: { value: true, writable: true, enumerable: true }
});


/*
  Blaze stuff
*/

// Attach declaration hook to Blaze templates
Template.prototype.viewmodel = ViewModel.viewmodelHook;

// Hot code push is finished when body is rendered
Template.body.onRendered(() => is_hcp = false);


/*
  Hoisted utility functions
*/

// Get the current path, taking FlowRouter into account
// https://github.com/kadirahq/flow-router/issues/293
function getPath() {
  if (typeof FlowRouter !== "undefined")
    return FlowRouter.current().path;

  return location.pathname + location.search;
}

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
