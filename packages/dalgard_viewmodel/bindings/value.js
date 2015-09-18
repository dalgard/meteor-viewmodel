ViewModel.addBinding("value", function (data, args, kwhash) {
  var throttle = kwhash.throttle || parseInt(args[1], 10),
      leading = _.isBoolean(kwhash.leading) ? kwhash.leading : args[2] === "true",
      get = function (event, $elem, prop) {
        prop($elem.val());
      };

  if (throttle)
    get = _.throttle(get, throttle, { leading: leading });

  return {
    set: function ($elem, new_value) {
      $elem.val(new_value);
    },
    
    on: "cut paste keyup input change",

    get: get
  };
});
