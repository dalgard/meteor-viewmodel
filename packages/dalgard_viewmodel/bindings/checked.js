ViewModel.addBinding("checked", {
  set($elem, new_value) {
    $elem.prop("checked", new_value);
  },

  on: "change",

  get(event, $elem) {
    return $elem.prop("checked");
  }
});
