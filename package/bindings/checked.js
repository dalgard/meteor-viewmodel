ViewModel.addBinding("checked", {
  set: function (elem, value) {
    elem.prop("checked", value);
  },

  on: "change",

  get: function (event, elem) {
    return elem.prop("checked");
  }
});
