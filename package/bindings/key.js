ViewModel.addBinding("key", {
  on: "keyup",

  get: function (event, elem, prop, args) {
    if (event.keyCode === parseInt(args[0], 10))
      prop();
  }
});
