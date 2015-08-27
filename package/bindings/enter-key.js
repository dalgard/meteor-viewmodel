ViewModel.addBinding("enterKey", {
  on: "keyup",

  get: function (event, elem, key, args, kwhash) {
    if (event.which === 13 || event.keyCode === 13)
      this[key](event, elem, key, args, kwhash);
  }
});
