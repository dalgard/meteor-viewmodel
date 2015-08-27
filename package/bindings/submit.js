ViewModel.addBinding("submit", {
  on: "submit",

  get: function (event, elem, key, args, kwhash) {
    if (args[0] !== "true")
      event.preventDefault();

    this[key](event, elem, key, args, kwhash);
  }
});
