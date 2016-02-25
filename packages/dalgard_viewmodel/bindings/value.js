ViewModel.addBinding("value", function () {
  const use_hash = _.isObject(this.hash);
  const throttle = use_hash && this.hash.throttle || parseInt(this.args[1], 10);
  const leading = use_hash && _.isBoolean(this.hash.leading) ? this.hash.leading : String(this.args[2]) === "true";

  let get = function (event, elem, prop) {
    this.preventSet();

    prop(elem.value);
  };

  if (throttle)
    get = _.throttle(get, throttle, { leading });

  return {
    set(elem, new_value) {
      elem.value = new_value || "";
    },
    
    on: "cut paste keyup input change",

    get,
  };
});
