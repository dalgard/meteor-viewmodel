ViewModel.addBinding("value", function () {
  let use_hash = _.isObject(this.hash),
      throttle = use_hash && this.hash.throttle || parseInt(this.args[1], 10),
      leading = use_hash && _.isBoolean(this.hash.leading) ? this.hash.leading : String(this.args[2]) === "true",
      get = function (event, $elem, prop) {
        this.preventSet();

        prop($elem.val());
      };

  if (throttle)
    get = _.throttle(get, throttle, { leading: leading });

  return {
    set($elem, new_value) {
      $elem.val(new_value);
    },
    
    on: "cut paste keyup input change",

    get: get
  };
});
