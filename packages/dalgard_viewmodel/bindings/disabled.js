ViewModel.addBinding("disabled", {
  set: function (elem, new_value) {
    elem.prop("disabled", new_value);
  }
});
