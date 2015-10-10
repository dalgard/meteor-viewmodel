ViewModel.addBinding("hovered", {
  on: "mouseenter mouseleave",

  get(event) {
    return event.type === "mouseenter";
  }
});
