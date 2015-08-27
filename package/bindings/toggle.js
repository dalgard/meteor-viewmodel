ViewModel.addBinding("toggle", {
  on: "click",

  get: function (event, elem, key) {
    return !this[key]();
  }
});
