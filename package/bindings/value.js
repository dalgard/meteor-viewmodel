ViewModel.addBinding("value", function (data, key, args, kwargs) {
  var throttle = args[0] || kwargs.hash.throttle,
      get = function (event, elem, key) {
        this[key](elem.val());
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
