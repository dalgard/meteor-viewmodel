// Class for reactive lists
List = class List extends Array {
  constructor(...args) {
    super(...args);

    // Add dependency to list
    defineProperties(this, {
      dep: { value: new Tracker.Dependency }
    });
  }


  // Reactively add an item
  add(...items) {
    this.push(...items);

    this.dep.changed();
  }

  // Reactively remove an item
  remove(...items) {
    let result = false;

    _.each(items, item => {
      let index = this.indexOf(item),
          is_found = !!~index;

      if (is_found) {
        this.splice(index, 1);

        this.dep.changed();

        result = true;
      }
    });

    return result;
  }


  // Reactively get an array of matching items
  find(test) {
    this.dep.depend();

    // Possibly remove items failing test
    if (test) {
      return _.filter(this, (...args) => {
        if (_.isFunction(test))
          return test(...args);
        else if (_.isObject(args[0]) && _.isFunction(args[0].test))
          return args[0].test(test);
      });
    }

    return this.slice();
  }

  // Reactively get the first current item at index
  findOne(test, index) {
    if (_.isNumber(test))
      index = test, test = null;

    return this.find(test).slice(index || 0)[0] || null;
  }


  // Decorate an object with list methods operating on an internal list
  static decorate(obj, reference_key) {
    // Ensure type of arguments
    check(obj, Match.OneOf(Object, Function));
    check(reference_key, Match.Optional(String));

    // Internal list
    let list = new List;

    // Property descriptors
    let descriptor = {
      add: { value: list.add.bind(list) },
      remove: { value: list.remove.bind(list) },
      find: { value: list.find.bind(list) },
      findOne: { value: list.findOne.bind(list) }
    };

    // Possibly add a reference to the internal list
    if (reference_key)
      descriptor[reference_key] = { value: list };

    // Add bound methods
    defineProperties(obj, descriptor);
  }
};
