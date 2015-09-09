ViewModel.addBinding("submit", {
  on: "submit",

  get: function (event, elem, prop, args, kwhash) {
    if (args[0] !== "true")
      event.preventDefault();

    prop(event, args, kwhash);
  }
});
