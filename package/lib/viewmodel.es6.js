// Counter for unique ids
let uuid = 0;

// Global list of current viewmodel instances
let all = new ReactiveVar([]);

// Store bindings
let bindings = new ReactiveVar({});

// Whether the bind helper has been registered globally
let global = false;

// Global ReactiveDict for persistence after hot code push
let persist = new ReactiveDict("dalgard:viewmodel");


// Exported class
ViewModel = class ViewModel {
  constructor(view, name, props, persisted) {
    // Non-enumerable private properties (ES5)
    Object.defineProperties(this, {
      // Save name on viewmodel instance
      _name: { value: name || null },

      // Create list of child viewmodels
      _children: { value: new ReactiveVar([]) },

      // Save view on viewmodel instance
      _view: { value: view },

      // Save whether the viewmodel state should be persisted across renderings
      _persisted: { value: persisted || false }
    });

    // Attach to template instance
    this.templateInstance().viewmodel = this;


    let parent = this.parent();

    // Register with parent
    if (parent)
      parent._addChild(this);

    // Add to global list
    ViewModel._add(this);

    // Remove from parent and global list onDestroyed
    view.onViewDestroyed(() => {
      if (parent)
        parent._removeChild(this);

      ViewModel._remove(this)
    });


    // Definition may be a factory
    if (_.isFunction(props))
      props = props.call(this, this.getData());

    // Add properties
    this.addProps(props);


    // Restore viewmodel instance from last time the template was rendered
    if (persisted === true)
      this._restore();


    let hash_id = this._hashId();

    // Always save viewmodel state so it can be restored after a hot code push
    this.autorun(comp => {
      let map = this.serialize();

      // Wait for actual changes to arrive
      if (!comp.firstRun)
        persist.set(hash_id, map);
    });
  }

  // Add proper properties to the viewmodel
  addProps(props) {
    // Omit special reserved names
    props = _.omit(props, _.values(ViewModel._reservedProps.hooks), ViewModel._reservedProps.other);

    _.each(props, (prop, key) => {
      let is_primitive = !_.isFunction(prop);

      if (is_primitive) {
        // The actual value is stored here in the property functions' closure
        let value = new ReactiveVar(prop);

        // Each property is a reactive getter-setter
        prop = new_value => {
          if (!_.isUndefined(new_value))
            value.set(new_value);
          else
            return value.get();
        };
      }

      // Bind property to viewmodel
      this[key] = prop.bind(this);

      // Mark getter-setter with type (primitive values as opposed to computed properties)
      this[key].isPrimitive = is_primitive;


      let helper = {};

      // Create a Blaze helper for the property
      helper[key] = function () {
        let vm = Template.instance().viewmodel;

        return vm[key]();
      };

      // Register helper
      this._view.template.helpers(helper);
    });
  }

  // Restore persisted viewmodel values to instance
  _restore() {
    let hash_id = this._hashId(),
        map = persist.get(hash_id);

    this.deserialize(map);
  }


  // Bind an element
  bind(elem_or_id, type, key, args, kwargs) {
    let template_instance = this.templateInstance(),
        selector = _.isElement(elem_or_id) ? elem_or_id : "[vm-bind-id=" + elem_or_id + "]",
        binding = ViewModel._bindings()[type];

    // Binding may be a factory
    if (_.isFunction(binding))
      binding = binding.call(this, this.getData(), key, args, kwargs);

    // Wrap set function and add it to list of autoruns (gets called with viewmodel
    // as context and jQuery element and current property value as arguments)
    if (binding.set) {
      this.autorun(function () {
        let elem = template_instance.$(selector),
            value = key && this[key]();

        binding.set.call(this, elem, value, args, kwargs);
      });
    }

    // Add listener (registered inside onRendered) that calls property with result
    // of get function (gets called with viewmodel as context and the jQuery element,
    // current property value and event object as arguments)
    if (binding.on) {
      this.register(function () {
        let elem = template_instance.$(selector);

        // Register event
        elem.on(binding.on, event => {
          // Call property if there's no get function
          if (!binding.get) {
            this[key](event, elem, key, args, kwargs);
          }
          else {
            let result = binding.get.call(this, event, elem, key, args, kwargs);

            // Call property if get returned a value other than undefined
            if (!_.isUndefined(result))
              this[key](result);
          }
        });
      });
    }
  }

  // Register autorun(s) when the view is rendered
  autorun(autorun) {
    if (_.isArray(autorun))
      _.each(autorun, this.autorun, this);
    else if (this._view.isRendered)
      this._view.autorun(autorun.bind(this));
    else
      this._view.onViewReady(() => this._view.autorun(autorun.bind(this)));
  }

  // Register listener when the view is rendered
  register(listener) {
    if (this._view.isRendered)
      listener.call(this);
    else
      this._view.onViewReady(() => listener.call(this));
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

  // Reactively get an array of ancestor viewmodels or the first at index (within a depth
  // of levels), optionally filtered by name (string or regex)
  ancestors(name, index, levels) {
    // Name argument may be omitted or replaced by null
    if (!_.isString(name) && !_.isNull(name) && !_.isRegExp(name))
      levels = index, index = name, name = null;

    let view = this.templateInstance().view.parentView,
        level = 1,
        results = [];

    // Find closest view that has a template
    do if (view.template) {
      let vm = view.templateInstance().viewmodel,
          is_match = !!vm;

      // Possibly remove results with the wrong name
      if (is_match && name) {
        if (_.isRegExp(name))
          is_match = name.test(vm._name);
        else
          is_match = vm._name === name;
      }

      if (is_match)
        results.push(vm);

      if (results.length > index || ++level > levels)
        break;
    }
    while (view = view.parentView);

    // Return a single viewmodel or a list
    return _.isNumber(index) ? results[index] || null : results;
  }

  // Reactively get the first ancestor viewmodel at index, optionally filtered by name
  // (string or regex)
  ancestor(name, index) {
    if (_.isNumber(name))
      index = name, name = null;

    return this.ancestors(name || null, index || 0);
  }

  // Reactively get the parent viewmodel, optionally filtered by name (string or regex)
  parent(name) {
    return this.ancestors(name || null, 0, 1);
  }

  // Reactively get an array of descendant viewmodels or the first at index (within a depth
  // of levels), optionally filtered by name (string or regex)
  descendants(name, index, levels) {
    // Name argument may be omitted or replaced by null
    if (!_.isString(name) && !_.isNull(name) && !_.isRegExp(name))
      levels = index, index = name, name = null;

    let results = [];

    // Recursively collect descendant viewmodels
    (function next(children, level) {
      if (!_.isNumber(levels) || level <= levels) {
        _.each(children, vm => {
          if (!_.isNumber(index) || results.length <= index) {
            let is_match = true;

            if (name) {
              if (_.isRegExp(name))
                is_match = name.test(vm._name);
              else
                is_match = vm._name === name;
            }

            if (is_match)
              results.push(vm);

            next(vm._children.get(), level++);
          }
        });
      }
    })(this._children.get(), 1);

    // Return a single viewmodel or a list
    return _.isNumber(index) ? results[index] || null : results;
  }

  // Reactively get the first descendant viewmodel at index, optionally filtered by name
  // (string or regex)
  descendant(name, index) {
    if (_.isNumber(name))
      index = name, name = null;

    return this.descendants(name || null, index || 0);
  }

  // Reactively get an array of descendant viewmodels or the first at index (within a depth
  // of levels), optionally filtered by name (string or regex)
  children(name, index) {
    return this.descendants(name || null, index, 1);
  }

  // Reactively get the first child viewmodel at index, optionally filtered by name
  // (string or regex)
  child(name, index) {
    if (_.isNumber(name))
      index = name, name = null;

    return this.children(name || null, index || 0);
  }


  // Reactively get properties for serialization
  serialize() {
    let primitives = _.pick(this, prop => prop.isPrimitive),
        map = _.mapValues(primitives, prop => prop());

    return map;
  }

  // Restore serialized values
  deserialize(map) {
    _.each(map, (value, key) => this[key] && this[key](value));
  }

  // Get an id that is a hash of the viewmodel instance's index in the global list,
  // its position in the view hierarchy, and the current browser location
  _hashId() {
    let view = this._view,
        index = _.indexOf(ViewModel.all(), this),
        view_names = [];

    do view_names.push(view.name);
    while (view = view.parentView);

    return SHA256(index + view_names.join("/") + location.href);
  }


  // Reactively get global list of current viewmodels
  static all() {
    return all.get();
  }

  // Reactively get an array of current viewmodels or the first at index,
  // optionally filtered by name (string or regex)
  static find(name, index) {
    // Name argument may be omitted or replaced by null
    if (!_.isString(name) && !_.isNull(name) && !_.isRegExp(name))
      index = name, name = null;

    let results = this.all();

    // Remove results with the wrong name
    if (name)
      results = _.filter(results, vm => _.isRegExp(name) ? name.test(vm._name) : vm._name === name);

    // Return a single viewmodel or a list
    return _.isNumber(index) ? results[index] || null : results;
  }

  // Reactively get the first current viewmodel at index, optionally filtered by name
  // (string or regex)
  static findOne(name, index) {
    if (_.isNumber(name))
      index = name, name = null;

    return this.find(name || null, index || 0);
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

    bindings.curValue[name] = definition;
    bindings.dep.changed();
  }


  // Get next unique id
  static _uniqueId() {
    return ++uuid;
  }

  // The Blaze helper that is bound to templates with a viewmodel {{bind 'type: key'}}
  static _bindHelper(...pairs) {
    // Keywords argument
    let kwargs = pairs.pop();

    // Unique id for current element
    let bind_id = ViewModel._uniqueId();

    _.each(pairs, pair => {
      pair = pair.trim().split(/\s*:\s*/);

      let type = pair[0],
          args = pair[1].split(/\s+/g),
          key = args.shift(),
          vm = Template.instance().viewmodel;


      // Possibly create new viewmodel instance on view
      if (!vm)
        vm = new ViewModel(Blaze.getView());

      // Create properties on viewmodel if needed (initialized as undefined)
      if (!vm[key])
        vm.addProps(_.zipObject([key]));


      // Bind elements after they have been added to the view
      Tracker.afterFlush(() => vm.bind(bind_id, type, key, args, kwargs));
    });

    return {
      "vm-bind-id": bind_id
    };
  }

  // Register the bind helper globally
  static registerHelper(name) {
    name = name || ViewModel.helperName;

    Template.registerHelper(name, ViewModel._bindHelper);

    ViewModel.helperName = name;
    global = true;
  }

  // Returns whether the bind helper has been registered globally
  static _isGlobal() {
    return global;
  }
}

// Reserved property names
Object.defineProperty(ViewModel, "_reservedProps", { value: {
  // Lifetime hooks
  hooks: {
    onCreated: "created",
    onRendered: "rendered",
    onDestroyed: "destroyed"
  },

  // Other special names
  other: [
    "autorun",
    "events"
  ]
}});


// The name used for the bind helper
ViewModel.helperName = "bind";
