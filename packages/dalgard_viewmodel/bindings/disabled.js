ViewModel.addBinding("disabled", {
  set(elem, new_value) {
    elem.disabled = new_value || false;
  },
});
