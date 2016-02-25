// Store for binding definitions
const bindings = new ReactiveMap;


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
      _options: { value: new ReactiveMap(options) },
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
  definition(context = {}, finalize = true) {
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

    // Convert event types to array
    if (def.on)
      def.on = def.on.split(/\s+/g);

    // Add options to definition
    _.defaults(def, this._options.all());


    // Get extends option
    const exts = this.option("extends");

    if (exts) {
      check(exts, Match.OneOf(String, [String]));

      // Resolve extends
      const defs = _.isArray(exts)
        ? _.map(exts, name => Binding.get(name).definition(context, false))
        : [Binding.get(exts).definition(context, false)];

      // Inherit
      _.defaults(def, ...defs);
    }


    // Possibly lock down all properties
    if (finalize) {
      defineProperties(def, _.mapValues(def, () => ({
        enumerable: false,
        writable: false,
        configurable: false,
      })));
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
