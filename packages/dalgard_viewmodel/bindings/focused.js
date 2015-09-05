ViewModel.addBinding("focused", {
  set: function (elem, new_value) {
    if (new_value)
      elem.focus();
    else
      elem.blur();
  },
  
  on: "focus blur",

  get: function (event) {
    return event.type === "focus";
  }
});
