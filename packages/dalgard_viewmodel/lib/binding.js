// Store for binding definitions
let bindings = new ReactiveMap;


// Class for binding definitions
Binding = class Binding {
  constructor(name, definition, options) {
    // Ensure type of arguments
    check(name, String);
    check(definition, Match.OneOf(Object, Function));
    check(options, Match.Optional(Object));

    // Static properties on property instance
    defineProperties(this, {
      // Binding name
      name: { value: name },

      // Binding definition
      _definition: { value: definition },

      // Configuration options
      _options: { value: new ReactiveMap(options) }
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

  // Get resolve binding definition
  definition(context = {}) {
    // Ensure type of argument
    check(context, Object);

    let def = this._definition;

    // May be a factory
    if (_.isFunction(def))
      def = def.call(context);
    else
      def = _.cloneDeep(def);

    check(def, Object);


    // Add name to definition
    def.name = this.name;

    // Add options to definition
    _.defaults(def, this._options.all());

    // Lock down all properties
    defineProperties(def, _.mapValues(def, () => ({
      enumerable: false,
      writable: false,
      configurable: false
    })));


    // Get extends option
    let exts = this.option("extends");

    if (exts) {
      check(exts, Match.OneOf(String, [String]));

      // Resolve extends
      let defs = _.isArray(exts)
        ? _.map(exts, name => Binding.get(name).definition(context))
        : [Binding.get(exts).definition(context)];

      // Inherit
      _.defaults(def, ...defs);
    }

    return def;
  }


  // Add binding to the global list
  static add(name, definition, options) {
    let binding = new Binding(name, definition, options);

    // Add to reactive map
    bindings.set(name, binding);
  }

  // Get binding by name
  static get(name) {
    // Ensure type of arguments
    check(name, String);

    return bindings.get(name) || null;
  }
};
