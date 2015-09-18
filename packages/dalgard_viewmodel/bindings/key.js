ViewModel.addBinding("key", {
  on: "keyup",

  get: function (event, $elem, prop, args, kwhash) {
    var key_code = _.isNumber(kwhash.keyCode) ? kwhash.keyCode : parseInt(args[1], 10);

    if (event.keyCode === key_code)
      prop(event, args, kwhash);
  }
});
