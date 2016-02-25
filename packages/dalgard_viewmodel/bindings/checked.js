ViewModel.addBinding("checked", {
  set(elem, new_value) {
    elem.checked = new_value || false;
  },

  on: "change",

  get(event, elem) {
    return elem.checked;
  },
});
