ViewModel.addBinding("key", {
  on: "keyup",

  get: function (event, elem, key, args, kwhash) {
    if (event.keyCode === parseInt(args[0], 10))
      this[key](event, elem, key, args, kwhash);
  }
});
