ViewModel.addBinding("radio", {
  set(elem, new_value) {
    if (elem.value === new_value)
      elem.checked = true;
  },
  
  on: "change",

  get(event, elem) {
    return elem.value;
  },
});
