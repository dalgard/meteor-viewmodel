ViewModel.addBinding("hovered", {
  on: "mouseenter mouseleave",

  get: function (event) {
    return event.type === "mouseenter";
  }
});
