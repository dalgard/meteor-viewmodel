ViewModel.addBinding("submit", {
  on: "submit",

  get: function (event, elem, prop, args, kwargs) {
    if (args[0] !== "true")
      event.preventDefault();

    prop(event, elem, args, kwargs);
  }
});
