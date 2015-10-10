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
    if (test)
      return _.filter(this, (...args) => _.isFunction(test) ? test(...args) : _.isFunction(item.test) && item.test(test));

    return this.slice();
  }

  // Reactively get the first current item at index
  findOne(test, index) {
    if (_.isNumber(test))
      index = test, test = null;

    return this.find(test).slice(index || 0)[0] || null;
  }

  // Decorate an object with list methods operating on an internal list
  static decorate(obj) {
    // Internal list
    let list = new List;

    // Add bound methods
    defineProperties(obj, {
      add: { value: list.add.bind(list) },
      remove: { value: list.remove.bind(list) },
      find: { value: list.find.bind(list) },
      findOne: { value: list.findOne.bind(list) }
    });
  }
};
