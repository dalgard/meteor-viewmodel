ViewModel.addBinding("checked", {
  set: function ($elem, new_value) {
    console.log("set");
    $elem.prop("checked", new_value);
  },

  on: "change",

  get: function (event, $elem) {
    console.log("get");
    return $elem.prop("checked");
  }
});
