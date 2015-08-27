ViewModel.addBinding("focused", {
  on: "focus blur",

  get: function (event) {
    return event.type === "focus";
  },

  set: function (elem, new_value) {
    if (new_value)
      elem.focus();
    else
      elem.blur();
  }
});
