ViewModel.addBinding("toggle", {
  on: "click",

  get(event, $elem, prop) {
    return !prop();
  }
});
