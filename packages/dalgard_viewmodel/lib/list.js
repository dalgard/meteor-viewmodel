// Class for reactive lists
List = class List extends Array {
  constructor (...args) {
    super(...args);

    // Add dependency to list
    defineProperties(this, {
      dep: { value: new Tracker.Dependency }
    });
  }


  // Reactively add an item
  add = (...items) => {
    this.push(...items);

    this.dep.changed();
  }

  // Reactively remove an item
  remove = (...items) => {
    let result = false;

    _.each(items, item => {
      const index = this.indexOf(item);
      const is_found = !!~index;

      if (is_found) {
        this.splice(index, 1);

        this.dep.changed();

        result = true;
      }
    });

    return result;
  }


  // Reactively get an array of matching items
  find = (...tests) => {
    this.dep.depend();

    // Possibly remove items failing test
    if (tests.length) {
      return _.filter(this, (item, index, list) => _.every(tests, test => {
        if (_.isFunction(test))
          return test(item, index, list);

        if (_.isObject(item) && _.isFunction(item.test))
          return item.test(test);

        return test === item;
      }));
    }

    // Return copy of array
    return this.slice();
  }

  // Reactively get the first current item at index
  findOne = (...args) => {
    // Handle trailing number arguments
    const tests = _.dropRightWhile(args, _.isNumber);
    const index = args.slice(tests.length).pop() || 0;

    // Use slice to allow negative indices
    return this.find(...tests).slice(index)[0] || null;
  }


  // Decorate an object with list methods operating on an internal list
  static decorate(obj, reference_key) {
    // Ensure type of arguments
    check(obj, Match.OneOf(Object, Function));
    check(reference_key, Match.Optional(String));

    // Internal list
    const list = new List;

    // Property descriptors
    const descriptor = {
      add: { value: list.add.bind(list) },
      remove: { value: list.remove.bind(list) },
      find: { value: list.find.bind(list) },
      findOne: { value: list.findOne.bind(list) },
    };

    // Possibly add a reference to the internal list
    if (reference_key)
      descriptor[reference_key] = { value: list };

    // Add bound methods
    defineProperties(obj, descriptor);
  }
};
