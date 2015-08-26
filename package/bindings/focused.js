ViewModel.addBinding("focused", {
  set: function (elem, value) {
    if (value)
      elem.focus();
    else
      elem.blur();
  },

  on: "focus blur",

  get: function (event) {
    return event.type === "focus";
  }
});
