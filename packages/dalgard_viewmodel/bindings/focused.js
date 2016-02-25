ViewModel.addBinding("focused", {
  set(elem, new_value) {
    if (new_value)
      return elem.focus();

    return elem.blur();
  },
  
  on: "focus blur",

  get(event) {
    return event.type === "focus";
  },
});
