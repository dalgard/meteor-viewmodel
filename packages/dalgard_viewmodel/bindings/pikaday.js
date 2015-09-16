ViewModel.addBinding("pikaday", function () {
  // Pikaday package must be present
  if (typeof Pikaday !== "function")
    throw new ReferenceError("Pikaday must be present for this binding to work (add richsilv:pikaday)");

  var pikaday_instance,
      is_setting = false;

  return {
    // Initialize Pikaday instance
    init: function ($elem, init_value, args, kwhash) {
      var position = kwhash.position || (args[2] ? args[1] + " " + args[2] : args[1]),
          options = {
            field: $elem[0],  // Use DOM element
            format: "DD-MM-YYYY",
            firstDay: 1,
            position: position || "bottom left"
          };

      // Possibly localize
      if (_.isObject(kwhash.i18n))
        options.i18n = kwhash.i18n;

      pikaday_instance = new Pikaday(options);
    },

    set: function ($elem, new_value) {
      // Prevent infinite loop, since setDate triggers a change event in spite of silent flag
      // https://github.com/dbushell/Pikaday/issues/402
      is_setting = true;

      pikaday_instance.setDate(new_value, true);

      // Clear field when the date is cleared
      if (!new_value)
        $elem.val("");

      is_setting = false;
    },

    on: "cut paste change",

    get: function (event, $elem, prop) {
      if (is_setting === false)
        return pikaday_instance.getDate();
    },

    // Destroy Pikaday instance to avoid memory leak
    dispose: function () {
      pikaday_instance.destroy();
    }
  };
});
