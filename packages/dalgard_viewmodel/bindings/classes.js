ViewModel.addBinding("classes", {
  set($elem) {
    let vm = this.viewmodel,
        classes = {};

    _.each(this.args, key => {
      if (_.isFunction(vm[key]))
        classes[key] = vm[key]();
    });

    // Keyword argument takes precedence
    if (_.isObject(this.hash) && this.hash.classes)
      _.extend(classes, this.hash.classes);

    _.each(classes, (value, class_name) => $elem.toggleClass(class_name, value));
  }
});
