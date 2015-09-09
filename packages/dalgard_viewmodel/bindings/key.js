ViewModel.addBinding("key", {
  on: "keyup",

  get: function (event, elem, prop, args, kwhash) {
    if (event.keyCode === parseInt(args[1], 10))
      prop(event, args, kwhash);
  }
});
