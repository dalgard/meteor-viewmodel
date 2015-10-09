ViewModel.addBinding("pikadayKeys", function () {
  // Pikaday package must be present
  if (typeof Pikaday !== "function")
    throw new ReferenceError("Pikaday must be present for this binding to work (add richsilv:pikaday)");

  var pikaday_instance,
      position,
      is_setting = false,
      is_getting = false;

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
      is_setting = false;

      if (is_getting === true && _.isNumber(position)) {
        var start, end;

        if (position <= 2) 
          start = 0, end = 2;
        else if (position >= 3 && position <= 5)
          start = 3, end = 5;
        else
          start = 6, end = 10;

        $elem[0].setSelectionRange(start, end);
      }

      // Clear field when the date is cleared
      if (!new_value)
        $elem.val("");
    },

    on: "cut paste change keyup keypress keydown",

    get: function (event, $elem, prop) {
      if (event.type === "cut" || event.type === "paste" || event.type === "change") {
        if (is_setting === false)
          return pikaday_instance.getDate();
      }
      else {
        var delta = 39 - event.which;

        // Keyboard arrow up or down
        if (Math.abs(delta) === 1) {
          // Prevent moving caret if keydown or keypress
          if (event.type !== "keyup")
            return event.preventDefault();

          var date = prop();

          if (_.isDate(date)) {
            position = $elem[0].selectionStart;

            if (_.isNumber(position)) {
              if (position <= 2) 
                date.setDate(date.getDate() + delta);
              else if (position >= 3 && position <= 5)
                date.setMonth(date.getMonth() + delta);
              else
                date.setFullYear(date.getFullYear() + delta);

              is_getting = true;
              prop(date);
              is_getting = false;
            }
          }
        }
      }
    },

    // Destroy Pikaday instance to avoid memory leak
    dispose: function () {
      pikaday_instance.destroy();
    }
  };
});
