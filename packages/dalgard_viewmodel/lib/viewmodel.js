// Counter for unique ids
let uid = 0;

// Whether we are in the middle of a hot code push
let is_hcp = true;

// Whether the bind helper has been registered globally
let is_global = false;

// ReactiveDict for persistence after hot code push and across re-rendering
const persist = new ReactiveDict("dalgard:viewmodel");


// Exported class for viewmodels
ViewModel = class ViewModel extends Base {
  constructor(view, name = view.name, id = ViewModel.uid(), definition, options) {
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
      _children: { value: new List },

      // Configuration options
      _options: { value: new ReactiveMap(options) },
    });

    // Attach to template instance
    view.templateInstance()[ViewModel.viewmodelKey] = this;


    // Experimental feature: Add existing Blaze helpers as viewmodel methods that are
    // bound to the normal helper context
    _.each(view.template.__helpers, (helper, key) => {
      if (key.charAt(0) === " " && _.isFunction(helper) && helper !== ViewModel.bindHelper && !helper.isPropertyHelper) {
        key = key.slice(1);

        const property = new Property(this, key, function (...args) {
          return helper.call(this.getData(), ...args);
        });

        // Save accessor as viewmodel property
        this[key] = property.accessor;
      }
    });

    // Possibly add properties
    if (definition)
      this.addProps(definition);


    // Get parent for non-transcluded viewmodels
    const parent = this.parent();

    // Possibly register with parent
    if (parent)
      parent.addChild(this);

    // Add to global list
    ViewModel.add(this);

    // Tear down viewmodel
    this.onDestroyed(function () {
      // Remove from global list
      ViewModel.remove(this);

      // Possibly remove from parent
      if (parent)
        parent.removeChild(this);
    });


    const hash_id = this.hashId(true);
    const is_hcp_restore = ViewModel.restoreAfterHCP && is_hcp;

    // Possibly restore viewmodel instance from the last time the template was rendered
    // or after a hot code push
    if (this.isPersisted() || is_hcp_restore)
      this.restore(hash_id);

    // Always save viewmodel state so it can be restored after a hot code push
    this.autorun(function (comp) {
      // Always register dependencies
      const map = this.serialize();

      // Wait for actual changes to arrive
      if (!comp.firstRun)
        persist.set(hash_id, map);
    });

    // Remove viewmodel from store if not persisted
    this.onDestroyed(function () {
      if (!this.isPersisted())
        delete persist.keys[hash_id];
    });
  }


  // Reactively get or set configuration options
  option(key, value) {
    // Ensure type of argument
    check(key, String);

    // Getter
    if (_.isUndefined(value))
      return this._options.get(key);

    this._elem.set(key, value);

    // Return value if setter
    return value;
  }

  // Add properties to the viewmodel
  addProps(definition) {
    // Ensure type of argument
    check(definition, Match.Optional(Match.OneOf(Object, Function)));

    // Definition may be a factory
    if (_.isFunction(definition))
      definition = definition.call(this, this.getData());

    const is_object = _.isObject(definition);

    if (is_object) {
      // Possibly add autoruns
      if (definition.autorun)
        this.autorun(definition.autorun);

      const template = this.templateInstance().view.template;

      _.each(definition, (init_value, key) => {
        if (key !== "autorun") {
          const property = new Property(this, key, init_value);

          // Save accessor as viewmodel property
          this[key] = property.accessor;

          // Register Blaze helper
          template.helpers({ [key]: Property.helper(key) });
        }
      });
    }

    return is_object;
  }

  // Bind an element programmatically
  bind(selector, binding, ...args) {
    // Context object for resolving bindings
    const context = {};

    defineProperties(context, {
      // Reference to viewmodel
      viewmodel: { value: this },

      // Data context of template instance
      data: { value: this.getData() },

      // Arguments for binding
      args: { value: args },
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

  // Test whether element is in same template instance or delegate to super
  test(test) {
    // Compare with template instance
    if (_.isElement(test))
      return ViewModel.templateInstance(test) === this.templateInstance();
    
    return super.test(test);
  }


  // Get a hash based on the position of the viewmodel in the view hierarchy,
  // the index of the viewmodel in relation to sibling viewmodels, and, optionally,
  // the current browser location
  hashId(use_path) {
    const path = use_path ? getPath() : "";
    const parent = this.parent();
    const index = parent ? _.indexOf(parent.children(), this) : "";
    const parent_hash_id = parent ? parent.hashId() : "";
    const view_names = [];

    let view = this.view;

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
  isPersisted() {
    let persist = this.option("persist");

    if (!persist) {
      const parent = this.parent();

      persist = parent && parent.isPersisted();
    }

    return persist;
  }

  // Restore persisted viewmodel values to instance
  restore(hash_id = this.hashId(true)) {
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
  addChild(vm) {
    // Ensure type of argument
    check(vm, ViewModel);

    return this._children.add(vm);
  }

  // Reactively remove a child viewmodel from the _children list
  removeChild(vm) {
    // Ensure type of argument
    check(vm, ViewModel);

    return this._children.remove(vm);
  }

  // Reactively get a filtered array of child viewmodels
  children(...tests) {
    return this._children.find(...tests);
  }

  // Reactively get the first child or the child at index in a filtered array of
  // child viewmodels
  child(...args) {
    return this._children.findOne(...args);
  }

  // Reactively get a filtered array of descendant viewmodels, optionally within
  // a depth
  descendants(...args) {
    // Handle trailing number arguments
    const tests = _.dropRightWhile(args, _.isNumber);
    const numbers = args.slice(tests.length).slice(-1);
    const depth = _.isNumber(numbers[0]) ? numbers.shift() : Infinity;

    let descendants = [];

    if (depth > 0) {
      const children = this.children(...tests);

      _.each(children, child => {
        descendants.push(child);

        descendants = descendants.concat(child.descendants(depth - 1));
      });
    }

    return descendants;
  }

  // Reactively get the first descendant or the descendant at index in a filtered
  // array of descendant viewmodels, optionally within a depth
  descendant(...args) {
    // Handle trailing number arguments
    const tests = _.dropRightWhile(args, _.isNumber);
    const numbers = args.slice(tests.length).slice(-2);
    const index = numbers.shift() || 0;

    // Add depth to the end of tests again
    if (_.isNumber(numbers[0]))
      tests.push(numbers.shift());

    // Use slice to allow negative indices
    return this.descendants(...tests).slice(index)[0] || null;
  }

  // Reactively get the parent viewmodel filtered by tests
  parent(...tests) {
    // Transcluded viewmodels have no ancestors
    if (!this.option("transclude")) {
      let parent_view = this.view.parentView;

      do if (parent_view.template) {
        const vm = parent_view.templateInstance()[ViewModel.viewmodelKey];

        // Transcluded viewmodels are taken out of the hierarchy
        if (vm && !vm.option("transclude")) {
          if (tests.length) {
            const is_every = _.every(tests, test => {
              if (_.isFunction(test))
                return test(vm);

              return vm.test(test);
            });

            if (!is_every)
              return null;
          }

          return vm;
        }
      }
      while (parent_view = parent_view.parentView);
    }

    return null;
  }

  // Reactively get a filtered array of ancestor viewmodels, optionally within
  // a depth
  ancestors(...args) {
    // Handle trailing number arguments
    const tests = _.dropRightWhile(args, _.isNumber);
    const numbers = args.slice(tests.length).slice(-1);
    const depth = _.isNumber(numbers[0]) ? numbers.shift() : Infinity;

    let ancestors = [];

    if (depth > 0) {
      const parent = this.parent(...tests);

      if (parent) {
        ancestors.push(parent);

        ancestors = ancestors.concat(parent.ancestors(depth - 1));
      }
    }

    return ancestors;
  }

  // Reactively get the first ancestor or the ancestor at index in a filtered
  // array of ancestor viewmodels, optionally within a depth
  ancestor(...args) {
    // Handle trailing number arguments
    const tests = _.dropRightWhile(args, _.isNumber);
    const numbers = args.slice(tests.length).slice(-2);
    const index = numbers.shift() || 0;

    // Add depth to the end of tests again
    if (_.isNumber(numbers[0]))
      tests.push(numbers.shift());

    // Use slice to allow negative indices
    return this.ancestors(...tests).slice(index)[0] || null;
  }


  // Get next unique id
  static uid() {
    return ++uid;
  }

  // Add a binding to the global list
  static addBinding(...args) {
    return Binding.add(...args);
  }


  // Reactively get an array of serialized current viewmodels, optionally filtered by name
  static serialize(name) {
    const viewmodels = this.find(name);

    return _.map(viewmodels, vm => vm.serialize());
  }

  // Restore an array of serialized values on the current viewmodels, optionally filtered by name
  static deserialize(maps, name) {
    // Ensure type of argument
    check(maps, Array);

    const viewmodels = this.find(name);

    _.each(viewmodels, (vm, index) => vm.deserialize(maps[index]));
  }


  // Ensure existence of a viewmodel with optional property
  static ensureViewmodel(view, key) {
    // Ensure type of arguments
    check(view, Blaze.View);
    check(key, Match.Optional(String));

    const template_instance = templateInstance(view);

    let vm = template_instance[ViewModel.viewmodelKey];

    // Possibly create new viewmodel instance on view
    if (!(vm instanceof ViewModel))
      vm = new ViewModel(template_instance.view);

    // Possibly create missing property on viewmodel
    if (_.isString(key) && !_.isFunction(vm[key])) {
      // Initialize as undefined
      const definition = _.zipObject([key]);

      vm.addProps(definition);
    }

    return vm;
  }

  // The {{bind}} Blaze helper
  static bindHelper(...args) {
    const view = Blaze.getView();
    const data = Blaze.getData();

    // Unique bind id for current element
    const bind_id = ViewModel.uid();

    let hash = args.pop();  // Keyword arguments
    let bind_exps = [];

    // Possibly use hash of Spacebars keywords arguments object
    if (hash instanceof Spacebars.kw)
      hash = hash.hash;

    // Support multiple bind expressions separated by comma
    _.each(args, arg => bind_exps = bind_exps.concat(arg.split(/\s*,\s*/g)));


    // Loop through bind expressions
    _.each(bind_exps, exp => {
      // Split bind expression at first colon
      exp = exp.trim().split(/\s*:\s*/);

      const args = _.isString(exp[1]) ? exp[1].split(/\s+/g) : [];
      const selector = "[" + ViewModel.bindAttrName + "='" + bind_id + "']";
      const binding_name = exp[0];

      // Context object for resolving bindings
      const context = {};

      defineProperties(context, {
        // Current data context
        data: { value: data },

        // Space separated strings after the colon in bind expressions
        args: { value: args },

        // Hash object of Spacebars keyword arguments
        hash: { value: hash },
      });

      // Create binding nexus
      new Nexus(view, selector, binding_name, context);
    });


    // Set the dynamic bind id attribute on the element in order to select it after rendering
    return { [ViewModel.bindAttrName]: bind_id };
  }

  // Register the bind helper globally
  static registerHelper(name = ViewModel.helperName) {
    // Ensure type of argument
    check(name, String);

    // Global helper
    Template.registerHelper(name, ViewModel.bindHelper);

    // Save name
    ViewModel.helperName = name;

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


    // Give all instances of this viewmodel the same id (used when sharing state)
    const id = ViewModel.uid();

    // Create viewmodel instance – a function is added to the template's onCreated
    // hook, wherein a viewmodel instance is created on the view with the properties
    // from the definition object
    this.onCreated(function () {
      const template = this.view.template;

      // If the helper hasn't been registered globally
      if (!is_global) {
        // Register the Blaze bind helper on this template
        template.helpers({
          [ViewModel.helperName]: ViewModel.bindHelper,
        });
      }


      // Check existing viewmodel on template instance
      const vm = this[ViewModel.viewmodelKey];

      // Create new viewmodel instance on view or add properties to existing viewmodel
      if (!(vm instanceof ViewModel)) {
        new ViewModel(this.view, name, id, definition, options);
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
  nexusesKey: { value: "nexuses", writable: true, enumerable: true },

  // Name of viewmodel reference on template instances
  viewmodelKey: { value: "viewmodel", writable: true, enumerable: true },

  // Whether to try to restore viewmodels in this project after a hot code push
  restoreAfterHCP: { value: true, writable: true, enumerable: true },

  // Utility method
  templateInstance: { value: templateInstance },

  // Nexus class
  Nexus: { value: Nexus },
});

// Decorate ViewModel class with static list methods operating on an internal list
List.decorate(ViewModel);


/*
  Blaze stuff
*/

// Attach declaration hook to Blaze templates
Template.prototype.viewmodel = ViewModel.viewmodelHook;

// Hot code push is finished when body is rendered
Template.body.onRendered(() => is_hcp = false);
