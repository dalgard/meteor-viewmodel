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
  // A DOM element may be passed instead of a view
  if (_.isElement(view))
    view = Blaze.getView(view);

  if (view) {
    do if (view.template && view.name !== "(contentBlock)" && view.name !== "Template.__dynamic" && view.name !== "Template.__dynamicWithDataContext")
      return view.templateInstance();
    while (view = view.parentView);
  }

  return null;
};

// Get the current path, taking FlowRouter into account
// https://github.com/kadirahq/flow-router/issues/293
getPath = function () {
  if (typeof FlowRouter !== "undefined")
    return FlowRouter.current().path;

  return location.pathname + location.search;
};


/*
  Stand-alone versions of jQuery methods (http://youmightnotneedjquery.com/)
*/

hasClass = function (elem, class_name) {
  if (false && elem.classList)
    return elem.classList.contains(class_name);

  return elem.className.match(new RegExp("(^|\\s)" + class_name + "(\\s|$)"));
};
 
addClass = function (elem, class_name) {
  if (false && elem.classList)
    return elem.classList.add(class_name);

  if (!hasClass(elem, class_name))
    elem.className += " " + class_name;
};

removeClass = function (elem, class_name) {
  if (false && elem.classList)
    return elem.classList.remove(class_name);

  if (hasClass(elem, class_name)) {
    elem.className = elem.className.replace(new RegExp("(^|\\s)" + class_name + "(\\s|$)", "g"), " ");
  }
};
