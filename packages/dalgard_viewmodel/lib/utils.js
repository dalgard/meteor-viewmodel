/*
  Private package utility functions
*/

// Use ES5 property definitions when available
defineProperties = function (obj, props) {
  if (_.isFunction(Object.defineProperties))
    Object.defineProperties(obj, props);
  else
    _.each(props, (prop, key) => obj[key] = prop.value);
};

// Get closest template instance for view
templateInstance = function (view) {
  do if (view.template)
    return view.templateInstance();
  while (view = view.parentView);

  return null;
};

// Get the current path, taking FlowRouter into account
// https://github.com/kadirahq/flow-router/issues/293
getPath = function () {
  if (typeof FlowRouter !== "undefined")
    return FlowRouter.current().path;

  return location.pathname + location.search;
};

// Add reactivity to HelperMap class or instance
makeHelperMapReactive = function (template, use_prototype) {
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
};
