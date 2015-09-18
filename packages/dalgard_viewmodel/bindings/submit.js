ViewModel.addBinding("submit", {
  on: "submit",

  get: function (event, $elem, prop, args, kwhash) {
    var send = _.isBoolean(kwhash.send) ? kwhash.send : args[1] === "true";

    if (!send)
      event.preventDefault();

    prop(event, args, kwhash);
  }
});
