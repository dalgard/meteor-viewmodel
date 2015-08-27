ViewModel.addBinding("submit", {
  on: "submit",

  get: function (event, elem, key, args, kwargs) {
    if (args[0] !== "true")
      event.preventDefault();

    this[key](event, elem, key, args, kwargs);
  }
});
