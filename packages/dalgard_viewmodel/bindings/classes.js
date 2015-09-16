ViewModel.addBinding("classes", {
  set: function ($elem, new_value, args, kwhash) {
    var classes = {};

    if (args.length)
      _.each(args, function (key) {
        if (_.isFunction(this[key]))
          classes[key] = this[key]();
      }, this);

    // Takes precedence
    if (_.isObject(kwhash) && kwhash.classes)
      _.extend(classes, kwhash.classes);

    _.each(classes, function (value, class_name) {
      $elem.toggleClass(class_name, value);
    });
  }
});
