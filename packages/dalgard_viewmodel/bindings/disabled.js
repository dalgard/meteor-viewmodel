ViewModel.addBinding("disabled", {
  set($elem, new_value) {
    $elem.prop("disabled", new_value);
  }
});
