ViewModel.addBinding("files", {
  on: "change",

  get: function (event, elem) {
    return elem.prop("files");
  }
});
