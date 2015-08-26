ViewModel.addBinding("value", function (data, key, args, kwargs) {
  var throttle = args[0] || kwargs.hash.throttle,
      get = function (event, elem, prop) {
        prop(elem.val());
      };

  if (throttle)
    get = _.throttle(get, throttle);

  return {
    set: function (elem, value) {
      elem.val(value);
    },

    on: "cut paste keyup input change",

    get: get
  };
});
