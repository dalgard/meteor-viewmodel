ViewModel.addBinding("enterKey", {
  on: "keyup",

  get: function (event, elem, prop) {
    if (event.which === 13 || event.keyCode === 13)
      prop();
  }
});
