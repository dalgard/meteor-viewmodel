// Counter for unique ids
let uid = 0;

// Global list of current viewmodel instances
let all = new ReactiveVar([]);

// Store for bindings
let bindings = new ReactiveVar({});

// Whether the bind helper has been registered globally
let global = new ReactiveVar(false);

// ReactiveDict for persistence after hot code push and optionally across re-rendering
let persist = new ReactiveDict("dalgard:viewmodel");

// Whether we are in the middle of a hot code push
let is_hcp = false;


// Exported class
ViewModel = class ViewModel {
  constructor(view, id = ViewModel.uniqueId(), name, definition, options) {
    // Ensure type of arguments
    check(view, Blaze.View);
    check(id, Match.Integer);
    check(name, Match.Optional(Match.OneOf(String, null)));
    check(definition, Match.Optional(Match.OneOf(Object, Function)));
    check(options, Match.Optional(Object));

    if (!(view.template instanceof Blaze.Template))
      throw new TypeError("The view passed to ViewModel must be a template view");


    // Non-enumerable private properties (ES5)
    defineProperties(this, {
      // Reference to view
      view: { value: view },

      // Viewmodel id
      _id: { value: id },

      // List of child viewmodels
      _children: { value: new ReactiveVar([]) },

      // Viewmodel name
      _name: { value: new ReactiveVar(null) },

      // Viewmodel options
      _options: { value: new ReactiveDict() }
    });

    // Possibly save the viewmodel name
    if (_.isString(name))
      this.name(name);

    // Possibly save configuration options
    if (_.isObject(options))
      _.each(options, (value, name) => this.option(name, value));

    // Attach to template instance
    this.templateInstance()[ViewModel.referenceName] = this;


    // Possibly add properties
    if (definition)
      this.addProps(definition);


    // Get parent for non-transcluded viewmodels
    let parent = this.parent();

    // Possibly register with parent
    if (parent)
      parent._addChild(this);

    // Add to global list
    ViewModel._add(this);

    // Tear down viewmodel
    view.onViewDestroyed(function () {
      // Possibly remove from parent
      if (parent)
        parent._removeChild(this);

      // Remove from global list
      ViewModel._remove(this)
    }.bind(this));  // Bind to viewmodel


    let hash_id = this.hashId(true);

    // Possibly restore viewmodel instance after hot code push or from the last time
    // the template was rendered
    if (ViewModel._isHCP() || this._isPersisted())
      this._restore(hash_id);

    // Always save viewmodel state so it can be restored after a hot code push
    this.autorun(function (comp) {
      // Always register dependencies
      let map = this.serialize();

      // Wait for actual changes to arrive
      if (!comp.firstRun)
        persist.set(hash_id, map);
    }.bind(this));  // Bind to viewmodel

    // Remove viewmodel from store if not persisted
    view.onViewDestroyed(function () {
      if (!this._isPersisted())
        delete persist.keys[hash_id];
    }.bind(this));  // Bind to viewmodel
  }

  // Reactively get or set the name of the viewmodel
  name(new_name) {
    // Ensure type of argument
    check(new_name, Match.Optional(String));

    if (_.isString(new_name))
      this._name.set(new_name);
    else
      return this._name.get();
  }

  // Reactively get or set configuration options of the viewmodel
  option(name, new_value) {
    // Ensure type of argument
    check(name, String);

    if (!_.isUndefined(new_value))
      this._options.set(name, new_value);
    else
      return this._options.get(name);
  }

  // Add properties to the viewmodel
  addProps(definition) {
    // Ensure type of argument
    check(definition, Match.Optional(Match.OneOf(Object, Function)));

    // Definition may be a factory
    if (_.isFunction(definition))
      definition = definition.call(this, this.getData());

    // Omit special reserved names
    definition = _.omit(definition, "autorun");

    _.each(definition, (prop, key) => {
      // Create getter-setter, if the value is a primitive (as opposed to a computed
      // property)
      if (!_.isFunction(prop)) {
        let init_value = prop;

        // The actual value is stored here in the property functions' closure.
        // Initial values are cloned to avoid sharing objects and arrays between
        // instances of the same viewmodel
        let value = new ReactiveVar(_.cloneDeep(init_value));

        // Each property is a reactive getter-setter
        prop = function (new_value) {
          if (!_.isUndefined(new_value)) {
            value.set(new_value);

            // Write to other viewmodels if shared
            if (this.option("share")) {
              let shared = ViewModel.find(vm => vm._id === this._id);

              _.each(shared, vm => vm[key]._value.set(new_value));
            }
          }
          else
            return value.get();
        }.bind(this);  // Bind to viewmodel

        // Add static properties to getter-setter
        defineProperties(prop, {
          // Mark prop as a primitive
          isPrimitive: { value: true },

          // Save reference to reactivevar
          _value: { value: value },

          // Save initial value
          initial: { value: init_value },

          // Add reset method
          reset: { value: resetValue },

          // Add nonreactive method
          nonreactive: { value: _.partial(nonreactiveValue, this, key) }
        });
      }
      else {
        // Bind to viewmodel
        prop = prop.bind(this);
      }

      // Save property on viewmodel
      this[key] = prop;


      // Register Blaze helper for the property
      this.view.template.helpers({
        [key](...args) {
          let vm = Template.instance()[ViewModel.referenceName],
              kwhash = args.pop();  // Keywords argument;

          // Use hash of Spacebars keywords arguments object if it has any properties
          if (kwhash instanceof Spacebars.kw)
            kwhash = kwhash.hash;

          let spread = [kwhash];

          // Add arguments
          spread.unshift(...args);

          return vm[key](...spread);
        }
      });
    });
  }

  // Register one or more autoruns when the view is rendered
  autorun(callback) {
    // Ensure type of argument
    check(callback, Match.OneOf(Function, Array));

    if (_.isArray(callback))
      // May be an array of callbacks
      _.each(callback, this.autorun, this);
    else {
      // May have been called with either a viewmodel or a view as context
      let view = this instanceof ViewModel ? this.view : this;

      callback = callback.bind(this);

      if (view.isRendered) {
        if (!view.isDestroyed)
          // Bind callback to context
          Tracker.afterFlush(() => view.autorun(callback));
      }
      else
        // Bind callback to context
        view.onViewReady(() => view.autorun(callback));
    }
  }

  // Bind an element
  bind(elem, binding, args = [], kwhash = {}) {
    // The context is a viewmodel when bind is called explicitly and a pseudo viewmodel
    // when called via a bind helper
    check(this, Match.OneOf(ViewModel, {
      view: Blaze.View,
      templateInstance: Function
    }));

    // Ensure type of arguments
    check(elem, Match.OneOf(Match.Integer, Match.Where(_.isElement)));
    check(binding, Match.OneOf(String, Object));
    check(args, [String]);
    check(kwhash, Object);


    let template_instance = this.templateInstance(),
        vm = template_instance[ViewModel.referenceName],
        context = vm || template_instance.view,
        key = args[0];

    // The name of a binding may be passed to bind
    if (_.isString(binding)) {
      binding = ViewModel.binding(binding, template_instance.view, template_instance.data, args, kwhash);

      // Ensure that binding is an object
      check(binding, Object);
    }

    if (!_.isElement(elem))
      // Get DOM element if only an id was passed
      elem = template_instance.$("[" + ViewModel.bindAttrName + "=" + elem + "]")[0];
    else
      // Redefine to elem's closest template instance
      template_instance = getTemplateInstance(elem);

    // Elem must be part of the DOM
    if (!document.body.contains(elem))
      throw new TypeError("The element passed to bind must be part of the DOM");


    if (binding.init || binding.on) {
      if (binding.init) {
        // Check type of definition property
        check(binding.init, Function);

        let init_value;

        if (vm && !_.isUndefined(key) && _.isFunction(vm[key]))
          init_value = vm[key]();

        // Run init function immediately
        binding.init.call(context, $(elem), init_value, args, kwhash);
      }

      if (binding.on) {
        // Check type of definition property
        check(binding.on, String);

        // Register event listener
        $(elem).on(binding.on, function (event) {
          let prop;

          if (vm && !_.isUndefined(key) && _.isFunction(vm[key]))
            prop = vm[key];

          if (binding.get) {
            // Check type of definition property
            check(binding.get, Function);

            let result = binding.get.call(context, event, $(elem), prop, args, kwhash);

            // Call property if get returned a value other than undefined
            if (!_.isUndefined(result) && _.isFunction(prop))
              prop.call(context, result);
          }
          else if (_.isFunction(prop))
            // Call property if get was omitted in the binding definition
            prop.call(context, event, args, kwhash);
        });
      }
    }


    if (binding.set) {
      // Check type of definition property
      check(binding.set, Function);
      
      // Wrap set function and add it to list of autoruns
      ViewModel.prototype.autorun.call(this.view, function () {
        // Possibly release elem for garbage collection
        elem = elem && template_instance.$(elem)[0];

        // Only re-depend on prop if element still exists in the view
        if (elem) {
          let new_value;

          if (vm && !_.isUndefined(key) && _.isFunction(vm[key]))
            new_value = vm[key]();

          binding.set.call(context, $(elem), new_value, args, kwhash);
        }
      });
    }


    // Possibly add dispose hooks on the first render
    if (binding.dispose) {
      // Check type of definition property
      check(binding.dispose, Function);

      let has_queue = ViewModel._hasQueue(this.view, ViewModel._disposeQueueName);

      // Register hooks if not already registered
      if (!has_queue) {
        let flush = _.partial(ViewModel._flush, this.view, ViewModel._disposeQueueName);

        // Only runs when the view is re-rendered
        this.view.onViewReady(flush);

        // Runs when the view is completely destroyed
        this.view.onViewDestroyed(flush);
      }

      // Wrap and add dispose function to queue
      ViewModel._queue(this.view, ViewModel._disposeQueueName, function () {
        // Possibly release elem for garbage collection
        elem = elem && template_instance.$(elem)[0];

        // Run dispose function if element has been removed from the view
        if (!elem) {
          let prop;

          if (vm && !_.isUndefined(key) && _.isFunction(vm[key]))
            prop = vm[key];

          binding.dispose.call(context, prop, args, kwhash);
        }
      });
    }
  }


  // Get a hash based on
  // 1) the position of the viewmodel in the view hierarchy,
  // 2) the index of the viewmodel in relation to sibling viewmodels, and,
  // 3) optionally, the current browser location
  hashId(use_path) {
    let path = use_path ? getPath() : "",
        parent = this.parent(),
        index = parent ? _.indexOf(parent.children(), this) : "",
        parent_hash_id = parent ? parent.hashId() : "",
        view_names = [],
        view = this.view;

    do view_names.push(view.name);
    while (view = view.parentView && !view.templateInstance()[ViewModel.referenceName]);

    return SHA256(path + index + view_names.join("/") + parent_hash_id);
  }

  // Reactively get properties for serialization
  serialize() {
    let primitives = _.pick(this, prop => _.isFunction(prop) && prop.isPrimitive),
        map = _.mapValues(primitives, prop => prop());

    return map;
  }

  // Restore serialized values
  deserialize(map) {
    // Ensure type of argument
    check(map, Match.Optional(Object));

    _.each(map, (value, key) => {
      let prop = this[key];

      // Set value on viewmodel or create missing property with value
      if (_.isFunction(prop) && prop.isPrimitive)
        prop(value);
      else
        this.addProps({ [key]: value });
    });
  }

  // Reset all primitive properties to their initial value
  reset() {
    // Ensure type of context
    check(this, ViewModel);

    let primitives = _.pick(this, prop => _.isFunction(prop) && prop.isPrimitive);

    _.each(primitives, prop => prop.reset());
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


  // Reactively get template instance
  templateInstance() {
    return this.view.templateInstance();
  }

  // Reactively get the template's data context
  getData() {
    return this.templateInstance().data;
  }


  // Test this viewmodel (predicate function) or its name (string or regex)
  _test(test) {
    if (_.isRegExp(test))
      return test.test(this.name())
    else if (_.isFunction(test))
      return test(this);

    return test === this.name();
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
      return _.filter(ancestors, ancestor => ancestor._test(name));

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
      let vm = parent_view.templateInstance()[ViewModel.referenceName];

      if (vm && !vm.option("transclude"))
        return !name || vm._test(name) ? vm : null;
    }
    while (parent_view = parent_view.parentView);

    return null;
  }

  // Reactively get an array of child viewmodels, optionally filtered by name
  children(name) {
    let children = this._children.get();

    // Possibly remove results with the wrong name and return result
    if (name)
      return _.filter(children, child => child._test(name));

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
      return _.filter(descendants, descendant => descendant._test(name));

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
  }


  // Reactively get an array of current viewmodels, optionally filtered by name
  static find(name) {
    let results = all.get();

    // Possibly remove results with the wrong name
    if (name)
      return _.filter(results, result => result._test(name));

    return results;
  }

  // Reactively get the first current viewmodel at index, optionally filtered by name
  static findOne(name, index) {
    if (_.isNumber(name))
      index = name, name = null;

    return this.find(name)[index || 0] || null;
  }

  // Reactively get an array of serialized current viewmodels, optionally filtered by name
  static serialize(name) {
    let all = ViewModel.find(name);

    return _.map(all, vm => vm.serialize());
  }

  // Restore an array of serialized values on the current viewmodels, optionally filtered by name
  static deserialize(maps, name) {
    // Ensure type of argument
    check(maps, Array);

    let all = ViewModel.find(name);

    _.each(all, (vm, index) => vm.deserialize(maps[index]));
  }


  // Add a viewmodel to the global list
  static _add(vm) {
    // Ensure type of argument
    check(vm, ViewModel);

    all.curValue.push(vm);
    all.dep.changed();
  }

  // Remove a viewmodel from the global list
  static _remove(vm) {
    // Ensure type of argument
    check(vm, ViewModel);

    let index = all.curValue.indexOf(vm);

    // Remove from array
    all.curValue.splice(index, 1);
    all.dep.changed();
  }

  // Get or set whether we are in a hot code push or not
  static _isHCP(state) {
    if (_.isBoolean(state))
      is_hcp = state;
    else
      return is_hcp;
  }


  // Add binding to ViewModel
  static addBinding(name, definition) {
    // Ensure type of argument
    check(name, String);
    check(definition, Match.OneOf(Object, Function));

    // Set a new property on the bindings object stored in a reactive-var
    bindings.curValue[name] = definition;
    bindings.dep.changed();
  }

  // Get the resolved definition object of a binding – if the binding (or any bindings
  // that it extends) is a factory, it is called with view as context
  static binding(name, view = Blaze.currentView, data, args = [], kwhash = {}) {
    // Ensure type of arguments
    check(name, String);

    let definition = bindings.get()[name];

    // Binding definition may be a factory
    if (_.isFunction(definition))
      definition = definition.call(view, data, args, kwhash);

    if (!_.isObject(definition))
      return null;

    if (_.isString(definition.extends))
      definition.extends = [definition.extends];

    // Inherit from other bindings
    if (_.isArray(definition.extends)) {
      let definitions = _.map(definition.extends, name => ViewModel.binding(name, view, data, args, kwhash));

      _.defaults(definition, ...definitions);
    }

    return definition;
  }


  // The Blaze helper that is bound to templates with a viewmodel {{bind 'binding: key'}}
  static bindHelper(...args) {
    let template_instance = Template.instance(),
        current_view = Blaze.currentView,
        dynamic_atts = {};

    // Only bind the element on the first invocation of the bind helper
    if (Tracker.currentComputation.firstRun) {
      let has_bind_queue = ViewModel._hasQueue(current_view, ViewModel._bindQueueName),
          bind_id = ViewModel.uniqueId(),  // Unique id for current element
          kwhash = args.pop(),             // Keywords argument
          bind_exps = [];

      // Possibly use hash of Spacebars keywords arguments object
      if (kwhash instanceof Spacebars.kw)
        kwhash = kwhash.hash;

      // Support multiple bind expressions separated by comma
      _.each(args, arg => bind_exps = bind_exps.concat(arg.split(/\s*,\s*/g)));


      // Loop through bind expressions
      _.each(bind_exps, bind_exp => {
        bind_exp = bind_exp.trim().split(/\s*:\s*/);

        let name = bind_exp[0],
            args = _.isString(bind_exp[1]) ? bind_exp[1].split(/\s+/g) : [],
            binding = ViewModel.binding(name, template_instance.view, this, args, kwhash);

        // Only continue if binding exists
        if (binding) {
          // Make sure viewmodel and properties exist, if not a detached binding
          if (!binding.detached) {
            let vm = template_instance[ViewModel.referenceName],
                key = args[0];

            // Possibly create new viewmodel instance on view
            if (!(vm instanceof ViewModel))
              vm = new ViewModel(template_instance.view);

            // Possibly create missing property on viewmodel (initialized as undefined)
            if (!_.isUndefined(key) && !vm[key])
              vm.addProps(_.zipObject([key]));
          }

          // Use a pseudo viewmodel as context when calling bind via helper
          let pseudo_vm = {
            view: current_view,
            templateInstance: () => template_instance
          };

          // Bind bind function to pseudo viewmodel
          let bound_bind = ViewModel.prototype.bind.bind(pseudo_vm, bind_id, binding, args, kwhash);

          // Add to bind queue
          ViewModel._queue(current_view, ViewModel._bindQueueName, bound_bind);
        }


        // Possibly add bind id attribute to the element
        if (bind_exps.length)
          dynamic_atts[ViewModel.bindAttrName] = bind_id;
      });

      if (!has_bind_queue) {
        let flush = _.partial(ViewModel._flush, current_view, ViewModel._bindQueueName);

        if (current_view.isRendered)
          // Flush queue AFTER the bind id attribute has been written
          Tracker.afterFlush(flush);
        else
          // Flush queues when the view has been rendered
          current_view.onViewReady(flush);
      }
    }
    else {
      // Flush queues BEFORE the bind id attribute is overwritten
      ViewModel._flush(current_view, ViewModel._bindQueueName);
    }

    // Set the dynamic bind id attribute on the element in order to select it after rendering
    return dynamic_atts;
  }

  // Add callback to queue on view instance
  static _queue(view_instance, queue_name, callback) {
    // Ensure type of arguments
    check(view_instance, Blaze.View);
    check(queue_name, String);
    check(callback, Function);

    if (!_.isArray(view_instance[queue_name]))
      view_instance[queue_name] = [];

    view_instance[queue_name].push(callback);
  }

  // Whether the view instance has queue
  static _hasQueue(view_instance, queue_name) {
    // Ensure type of arguments
    check(view_instance, Blaze.View);
    check(queue_name, Match.OneOf(String, Array));

    if (_.isArray(queue_name))
      return _.some(queue_name, name => ViewModel._flush(view_instance, name));
    else {
      let queue = view_instance[queue_name];

      return _.isArray(queue) && !_.isEmpty(queue);
    }
  }

  // Flush queue on view instance
  static _flush(view_instance, queue_name) {
    // Ensure type of argument
    check(view_instance, Blaze.View);
    check(queue_name, Match.OneOf(String, Array));

    if (_.isArray(queue_name))
      _.each(queue_name, name => ViewModel._flush(view_instance, name));
    else {
      let queue = view_instance[queue_name];

      // Call each callback
      if (_.isArray(queue))
        while (queue.length)
          queue.pop()();
    }
  }

  // Register the bind helper globally and make __helpers reactive
  static registerHelper(name = ViewModel.helperName) {
    // Ensure type of argument
    check(name, String);

    Template.registerHelper(name, ViewModel.bindHelper);
    ViewModel.helperName = name;

    // Experimental feature: Make the HelperMap of __helpers reactive
    makeHelperMapReactive(Template.body, true);

    // Indicate that the helper has been registered globally
    ViewModel._global(true);
  }

  // Returns whether the bind helper has been registered globally
  static _global(is_global) {
    if (_.isBoolean(is_global))
      global.set(is_global);
    else
      return global.get();
  }


  // Viewmodel declaration hook
  static viewmodelHook(name, definition, options) {
    // Must be called in the context of a template
    if (!(this instanceof Blaze.Template))
      throw new TypeError("viewmodelHook must be attached to Blaze.Template.prototype to work");

    // Name argument may be omitted
    if (_.isObject(name))
      options = definition, definition = name, name = null;

    // Ensure type of arguments
    check(name, Match.OneOf(String, null));
    check(definition, Match.OneOf(Object, Function));
    check(options, Match.Optional(Object));


    // If the helper hasn't been registered globally
    if (!ViewModel._global()) {
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
      let vm = this[ViewModel.referenceName];

      // Create new viewmodel instance on view or add properties to existing viewmodel
      if (vm instanceof ViewModel)
        vm.addProps(definition);
      else
        vm = new ViewModel(this.view, id, name, definition, options);

      // Add autoruns
      if (definition.autorun)
        vm.autorun(definition.autorun);
    });
  }
}

// Add static primitive properties to ViewModel class
defineProperties(ViewModel, {
  // Name of bind helper
  helperName: { value: "bind", writable: true, enumerable: true },

  // Name of attribute used by bind helper
  bindAttrName: { value: "vm-bind-id", writable: true, enumerable: true },

  // Name of bind queue on view instances
  _bindQueueName: { value: "_bindQueue", writable: true },

  // Name of dispose queue on view instances
  _disposeQueueName: { value: "_disposeQueue", writable: true },

  // Name of viewmodel reference on template instances
  referenceName: { value: "viewmodel", writable: true, enumerable: true },

  // Whether to try to restore viewmodels in this project after a hot code push
  restoreAfterHCP: { value: true, writable: true, enumerable: true }
});


/*
  Hoisted utility functions and detached methods
*/

// Get the closest template instance for element
function getTemplateInstance(elem) {
  let view = Blaze.getView(elem);

  do if (view.template) return view.templateInstance();
  while (view = view.parentView);
}

// Get the current path, taking FlowRouter into account
// https://github.com/kadirahq/flow-router/issues/293
function getPath() {
  if (typeof FlowRouter !== "undefined")
    return FlowRouter.current().path;

  return location.pathname + location.search;
}

// Use ES5 property definitions when available
function defineProperties(obj, props) {
  if (_.isFunction(Object.defineProperties))
    Object.defineProperties(obj, props);
  else
    _.each(props, (prop, key) => obj[key] = prop.value);
}

// Reset the value of a viewmodel property
function resetValue() {
  // Initial values are cloned to avoid sharing objects and arrays between instances
  // of the same viewmodel
  this._value.set(_.cloneDeep(this.initial));
}

// Get the value of a viewmodel property non-reactively
function nonreactiveValue(vm, key, new_value) {
  if (!_.isUndefined(new_value)) {
    this._value.curValue = new_value;

    // Write to other viewmodels if shared
    if (vm.option("share")) {
      let shared = ViewModel.find(other_vm => other_vm._id === vm._id);

      _.each(shared, shared_vm => shared_vm[key]._value.curValue = new_value);
    }
  }
  else
    return this._value.curValue;
}

// Add reactivity to HelperMap class or instance
function makeHelperMapReactive(template, is_global) {
  // Catch any exceptions, since this is an experimental feature
  try {
    var helpers = template.__helpers,
        prototype = helpers.constructor.prototype,
        helper_map = is_global ? prototype : helpers,
        orig_set = prototype.set,
        orig_get = prototype.get,
        orig_has = prototype.has;

    helper_map.set = function (name, helper) {
      if (_.isObject(this.__deps) && this.__deps[name])
        this.__deps[name].changed();

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
