ViewModel.addBinding("files", {
  on: "change",

  get(event, $elem) {
    return $elem.prop("files");
  }
});
