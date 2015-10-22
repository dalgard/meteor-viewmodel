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
  do if (view.template && view.name !== "(contentBlock)" && view.name !== "Template.__dynamic" && view.name !== "Template.__dynamicWithDataContext")
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
