ViewModel.addBinding("class", {
  set(elem) {
    let classes = this.hash;

    // Keyword arguments must be present
    if (_.isObject(classes)) {
      // Possibly only use indicated keys
      if (this.args.length)
        classes = _.pick(classes, this.args);

      _.each(classes, (value, name) => (value ? addClass(elem, name) : removeClass(elem, name)));
    }
  },
}, {
  // This binding doesn't need a viewmodel
  detached: true,
});
