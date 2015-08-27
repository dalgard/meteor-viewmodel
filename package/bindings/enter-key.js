ViewModel.addBinding("enterKey", {
  on: "keyup",

  get: function (event, elem, prop, args, kwargs) {
    if (event.which === 13 || event.keyCode === 13)
      prop(event, elem, args, kwargs);
  }
});
