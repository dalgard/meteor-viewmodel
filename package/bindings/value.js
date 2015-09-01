ViewModel.addBinding("value", function (data, prop, args, kwhash) {
  var throttle = args[1] || kwhash && kwhash.throttle,
      get = function (event, elem, prop) {
        prop(elem.val());
      };

  if (throttle)
    get = _.throttle(get, throttle, { leading: false });

  return {
    on: "cut paste keyup input change",

    get: get,

    set: function (elem, new_value) {
      elem.val(new_value);
    }
  };
});
