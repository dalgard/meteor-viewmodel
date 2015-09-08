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


// Exported class
ViewModel = class ViewModel {
  constructor(view, id, name, props, options) {
    // For some reason, the arrow functions below doesn't preserve the lexical scope
    // after transpilation, so a closure is used
    let vm = this;


    // Non-enumerable private properties (ES5)
    defineProperties(this, {
      // Reference to view
      _view: { value: view },

      // Viewmodel id
      _id: { value: id },

      // List of child viewmodels
      _children: { value: new ReactiveVar([]) },

      // Viewmodel name
      _name: { value: new ReactiveVar(null) },

      // List of child viewmodels
      _options: { value: new ReactiveDict() }
    });

    // Save the viewmodel name
    if (_.isString(name))
      this.name(name);

    // Save configuration options
    if (_.isObject(options))
      _.each(options, (value, name) => this.option(name, value));

    // Attach to template instance
    this.templateInstance().viewmodel = this;


    // Get parent for non-transcluded viewmodels
    let parent = this.parent();

    // Register with parent
    if (parent)
      parent._addChild(this);

    // Add to global list
    ViewModel._add(this);

    // Tear down viewmodel
    view.onViewDestroyed(() => {
      // Remove from parent
      if (parent)
        parent._removeChild(vm);

      // Remove from global list
      ViewModel._remove(vm)
    });


    // Definition may be a factory
    if (_.isFunction(props))
      props = props.call(this, this.getData());

    // Add properties
    if (_.isObject(props))
      this.addProps(props);


    // Enable persistence on hot code push and across re-rendering
    view.onViewReady(() => {
      // Would have used an arrow function, preserving `this`, but somehow the lexical
      // scope  isn't achieved after transpilation
      let hash_id = vm.hashId();

      // Restore viewmodel instance from last time the template was rendered
      if (vm._isPersisted())
        vm._restore(hash_id);

      // Always save viewmodel state so it can be restored after a hot code push
      vm.autorun(comp => {
        let map = vm.serialize();

        // Wait for actual changes to arrive
        if (!comp.firstRun)
          persist.set(hash_id, map);
      });
    });
  }

  // Reactively get or set the name of the viewmodel
  name(new_name) {
    if (!_.isUndefined(new_name))
      this._name.set(new_name);
    else
      return this._name.get();
  }

  // Reactively get or set configuration options of the viewmodel
  option(name, new_value) {
    if (!_.isUndefined(new_value))
      this._options.set(name, new_value);
    else
      return this._options.get(name);
  }

  // Add proper properties to the viewmodel
  addProps(props) {
    // Omit special reserved names
    props = _.omit(props, "created", "rendered", "destroyed", "autorun", "events");

    _.each(props, (prop, key) => {
      let is_primitive = !_.isFunction(prop),
          value = null;

      if (is_primitive) {
        // The actual value is stored here in the property functions' closure
        value = new ReactiveVar(prop);

        // Each property is a reactive getter-setter
        prop = new_value => {
          if (!_.isUndefined(new_value)) {
            value.set(new_value);

            // Write to other viewmodels if shared
            if (this.option("share")) {
              let shared = ViewModel.find(vm => vm._id === this._id);

              _.each(shared, vm => vm[key].value.set(new_value));
            }
          }
          else
            return value.get();
        };
      }

      // Bind property to viewmodel
      this[key] = prop.bind(this);

      // Mark getter-setter with type (primitive values as opposed to computed properties)
      this[key].isPrimitive = is_primitive;

      // Save reference to value
      if (value)
        this[key].value = value;


      let helper = {};

      // Create a Blaze helper for the property
      helper[key] = function (...args) {
        let vm = Template.instance().viewmodel,
            kwhash = args.pop();  // Keywords argument;

        // Use hash of Spacebars keywords arguments object if it has any properties
        if (kwhash instanceof Spacebars.kw)
          kwhash = kwhash.hash;

        let spread = [kwhash];

        // Add arguments
        spread.unshift(...args);

        return vm[key](...spread);
      };

      // Register helper
      this._view.template.helpers(helper);
    });
  }


  // Run a callback when the view is rendered
  _onReady(callback) {
    let view = this instanceof ViewModel ? this._view : this;

    if (view.isRendered)
      !view.isDestroyed && callback.call(this);
    else
      view.onViewReady(() => callback.call(this));
  }

  // Register autorun(s) when the view is rendered
  autorun(autorun) {
    if (_.isArray(autorun))
      _.each(autorun, this.autorun, this);
    else if (this._view.isRendered)
      !this._view.isDestroyed && this._view.autorun(autorun.bind(this));
    else
      this._view.onViewReady(() => this._view.autorun(autorun.bind(this)));
  }

  // Bind an element (called with either the view or a new viewmodel as context)
  bind(elem_or_id, binding, key, args, kwhash) {
    let template_instance = this.templateInstance(),
        selector = _.isElement(elem_or_id) ? elem_or_id : "[" + ViewModel.bindAttr + "=" + elem_or_id + "]";

    if (_.isString(binding))
      binding = ViewModel._bindings()[binding];

    // Binding may be a factory
    if (_.isFunction(binding))
      binding = binding.call(template_instance.view, template_instance.data, key, args, kwhash);

    // Register event and run init function on ready
    if (binding.on || binding.init) {
      // In case of a detached binding, the context here may be a Blaze view
      ViewModel.prototype._onReady.call(this, function () {
        let elem = template_instance.$(selector);

        // Run init function only once
        if (binding.init) {
          let prop = !_.isUndefined(key) && this[key],
              orig_value = binding.detached ? null : _.isFunction(prop) && prop();

          binding.init.call(this, elem, orig_value, args, kwhash);
        }

        // Add listener (registered inside onRendered) that calls property with result
        // of get function (gets called with viewmodel as context and the jQuery element,
        // current property value and event object as arguments)
        if (binding.on) {
          elem.on(binding.on, event => {
            // Call property if there's no get function
            if (!binding.detached && !binding.get && !_.isUndefined(key))
              this[key](event, elem, this[key], args, kwhash);
            else {
              let is_vm = this instanceof ViewModel,
                  prop;

              if (is_vm)
                prop = this[key];

              let result = binding.get.call(this, event, elem, prop, args, kwhash);

              // Call property if get returned a value other than undefined
              if (!binding.detached && !_.isUndefined(result) && !_.isUndefined(key))
                this[key](result);
            }
          });
        }
      });
    }

    // Wrap set function and add it to list of autoruns (gets called with viewmodel
    // as context and jQuery element and new property value as arguments)
    if (binding.set) {
      this.autorun(function (comp) {
        let elem = template_instance.$(selector),
            prop = !_.isUndefined(key) && this[key],
            new_value = binding.detached ? null : _.isFunction(prop) && prop();

        binding.set.call(this, elem, new_value, args, kwhash);
      });
    }
  }


  // Reactively get properties for serialization
  serialize() {
    let primitives = _.pick(this, prop => _.isFunction(prop) && prop.isPrimitive),
        map = _.mapValues(primitives, prop => prop());

    return map;
  }

  // Restore serialized values
  deserialize(map) {
    _.each(map, (value, key) => this[key] && this[key](value));
  }

  // Get an id that is a hash of the viewmodel instance's index in the global list,
  // its position in the view hierarchy, and the current browser location
  hashId() {
    let path = getPath(),
        index = _.indexOf(all.curValue, this),
        view_names = [],
        view = this._view;

    do view_names.push(view.name);
    while (view = view.parentView);

    return SHA256(path + index + view_names.join("/"));
  }

  // Check whether this viewmodel or any ancestor is persisted across re-rendering
  _isPersisted() {
    let parent = this.parent();

    return this.option("persist") || parent && parent._isPersisted();
  }

  // Restore persisted viewmodel values to instance
  _restore(hash_id = this.hashId()) {
    let map = persist.get(hash_id);

    this.deserialize(map);
  }


  // Reactively get template instance
  templateInstance() {
    return this._view.templateInstance();
  }

  // Get the view that the viewmodel is attached to
  getView() {
    return this._view;
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
    this._children.curValue.push(vm);
    this._children.dep.changed();
  }

  // Reactively remove a child viewmodel from the _children list
  _removeChild(vm) {
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

    // Remove results with the wrong name
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

    let parent_view = this._view.parentView;

    do if (parent_view.template) {
      let vm = parent_view.templateInstance().viewmodel;

      if (vm && !vm.option("transclude"))
        return !name || vm._test(name) ? vm : null;
    }
    while (parent_view = parent_view.parentView);

    return null;
  }

  // Reactively get an array of child viewmodels, optionally filtered by name
  children(name) {
    let children = this._children.get();

    // Remove results with the wrong name
    if (name)
      return _.filter(children, child => child._test(name));

    return children;
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

    // Remove results with the wrong name
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


  // Reactively get an array of current viewmodels, optionally filtered by name
  static find(name) {
    let results = all.get();

    // Remove results with the wrong name
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

  // Add a viewmodel to the global list
  static _add(vm) {
    all.curValue.push(vm);
    all.dep.changed();
  }

  // Remove a viewmodel from the global list
  static _remove(vm) {
    let index = all.curValue.indexOf(vm);

    // Remove from array
    all.curValue.splice(index, 1);
    all.dep.changed();
  }

  // Restore persisted viewmodel values to all current instances
  static _restoreAll() {
    _.each(all.curValue, vm => vm._restore());
  }


  // Reactively get all available bindings
  static _bindings() {
    return bindings.get();
  }

  // Add binding to ViewModel
  static addBinding(name, definition) {
    if (!_.isString(name))
      throw new TypeError("The name of the binding must be supplied as the first argument");

    // Set a new property on the bindings object stored in a reactive-var
    bindings.curValue[name] = definition;
    bindings.dep.changed();
  }


  // Get next unique id
  static _uniqueId() {
    return ++uid;
  }

  // The Blaze helper that is bound to templates with a viewmodel {{bind 'binding: key'}}
  static bindHelper(...args) {
    // Never rerun the bind helper. Normally, all dynamic attributes helpers are rerun, no
    // matter their dependencies, whenever another attribute helper on the element is rerun.
    if (!Tracker.currentComputation.firstRun)
      return;

    let kwhash = args.pop(),  // Keywords argument
        bind_exps = [];

    // Use hash of Spacebars keywords arguments object if it has any properties
    if (kwhash instanceof Spacebars.kw)
      kwhash = kwhash.hash;

    // Support multiple bind expressions separated by comma
    _.each(args, arg => bind_exps = bind_exps.concat(arg.split(/\s*,\s*/g)));


    // Unique id for current element
    let bind_id = ViewModel._uniqueId(),
        template_instance = Template.instance(),
        view = template_instance.view;

    _.each(bind_exps, bind_exp => {
      let spread = [kwhash];

      bind_exp = bind_exp.trim().split(/\s*:\s*/);

      let binding = ViewModel._bindings()[bind_exp[0]],
          args = _.isString(bind_exp[1]) ? bind_exp[1].split(/\s+/g) : [],
          key = args[0];

      // Add arguments
      spread.unshift(key, args);

      // Binding may be a factory
      if (_.isFunction(binding))
        binding = binding.call(view, this, ...spread);

      // Add more arguments
      spread.unshift(bind_id, binding);

      // Some bindings may not use a viewmodel at all
      if (binding.detached)
        // Use view as the context for the bind method
        Tracker.afterFlush(() => ViewModel.prototype.bind.call(view, ...spread));
      else {
        let vm = template_instance.viewmodel;

        // Possibly create new viewmodel instance on view
        if (!vm) {
          // Give the viewmodel a unique id that is used for sharing
          let id = ViewModel._uniqueId();

          vm = new ViewModel(view, id);
        }

        // Create properties on viewmodel if needed (initialized as undefined)
        if (!_.isUndefined(key) && !vm[key])
          vm.addProps(_.zipObject([key]));

        // Bind elements after they have been properly added to the view
        Tracker.afterFlush(() => vm.bind(...spread));
      }
    });

    return { [ViewModel.bindAttr]: bind_id };
  }

  // Register the bind helper globally
  static registerHelper(name = ViewModel.helperName) {
    Template.registerHelper(name, ViewModel.bindHelper);

    ViewModel.helperName = name;
    global.set(true);
  }

  // Returns whether the bind helper has been registered globally
  static _isGlobal() {
    return global.get();
  }

  // Viewmodel declaration hook
  static viewmodelHook(name, definition, options) {
    // Must be called in the context of a template
    if (!(this instanceof Blaze.Template))
      throw new TypeError("ViewModel.viewmodelHook must be attached to Blaze.Template.prototype to work");


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

      bind[ViewModel.helperName] = ViewModel.bindHelper;

      this.helpers(bind);
    }
  }
}

// The name used for the bind helper
ViewModel.helperName = "bind";

// The name of the attribute that is used by the bind helper
ViewModel.bindAttr = "vm-bind-id";

// Whether to try to restore viewmodels in this project after a hot code push
ViewModel.restoreAfterHCP = true;


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

// Use ES5 property definitions when available
function defineProperties(obj, props) {
  if (_.isFunction(Object.defineProperties))
    Object.defineProperties(obj, props);
  else
    _.each(props, (prop, key) => obj[key] = prop.value);
}