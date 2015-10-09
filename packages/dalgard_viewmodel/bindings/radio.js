ViewModel.addBinding("radio", {
  set($elem, new_value) {
    if ($elem.val() === new_value)
      $elem.prop("checked", true);
  },
  
  on: "change",

  get(event, $elem) {
    return $elem.val();
  }
});
