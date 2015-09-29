ViewModel.addBinding("radio", {
  set: function ($elem, new_value) {
    if ($elem.val() === new_value)
      $elem.prop("checked", true);
  },
  
  on: "change",

  get: function (event, $elem) {
    return $elem.val();
  }
});
