ViewModel.addBinding("radio", {
  get: function (event, elem) {
    return elem.val();
  },
  
  on: "change",

  set: function (elem, new_value) {
    if (elem.val() === new_value)
      elem.prop("checked", true);
  }
});