ViewModel.addBinding("focused", {
  set($elem, new_value) {
    if (new_value)
      $elem.focus();
    else
      $elem.blur();
  },
  
  on: "focus blur",

  get(event) {
    return event.type === "focus";
  }
});
