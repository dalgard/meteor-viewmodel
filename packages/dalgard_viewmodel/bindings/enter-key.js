ViewModel.addBinding("enterKey", {
  on: "keyup",

  get: function (event, $elem, prop, args, kwhash) {
    if (event.which === 13 || event.keyCode === 13)
      prop(event, args, kwhash);
  }
});
