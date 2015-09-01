ViewModel.addBinding("toggle", {
  on: "click",

  get: function (event, elem, prop) {
    return !prop();
  }
});
