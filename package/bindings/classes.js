ViewModel.addBinding("classes", {
  detached: true,

  set: function (elem, new_value, args, kwhash) {
    _.each(_.isObject(kwhash) && kwhash.classes, function (value, class_name) {
      elem.toggleClass(class_name, value);
    });
  }
});
