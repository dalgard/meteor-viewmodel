ViewModel.addBinding("pikaday", {
  // Initialize Pikaday instance
  init($elem) {
    // Pikaday package must be present
    if (typeof Pikaday !== "function")
      throw new ReferenceError("Pikaday must be present for this binding to work (add richsilv:pikaday)");

    let position = this.hash.position || (this.args[2] ? this.args[1] + " " + this.args[2] : this.args[1]),
        options = {
          field: $elem[0],  // Use DOM element
          format: this.hash.monthFirst ? "MM-DD-YYYY" : "DD-MM-YYYY",
          firstDay: 1,
          position: position || "bottom left"
        };

    // Possibly localize
    if (_.isObject(this.hash.i18n))
      options.i18n = this.hash.i18n;

    // Save instance on binding context
    this.instance = new Pikaday(options);
  },

  set($elem, new_value) {
    // Prevent infinite loop, since setDate triggers a change event in spite of silent flag
    // https://github.com/dbushell/Pikaday/issues/402
    this.isSetting = true;

    this.instance.setDate(new_value, true);

    this.isSetting = false;

    // Clear field when the date is cleared
    if (!new_value)
      $elem.val("");

    // Keyboard arrow controls
    if (this.isGetting) {
      let start = 0,
          end = 2;

      if (this.position >= 3 && this.position <= 5)
        start = 3, end = 5;
      else if (this.position > 5)
        start = 6, end = 10;

      $elem[0].setSelectionRange(start, end);
    }
  },

  on: "cut paste change keyup keypress keydown",

  get(event, $elem, prop) {
    let is_change = _.contains(["cut", "paste", "change"], event.type);

    if (is_change) {
      if (!this.isSetting) {
        return this.instance.getDate();
      }
    }
    else {
      // Check whether setSelectionRange is supported
      let is_supported = _.isFunction($elem[0].setSelectionRange);

      if (is_supported) {
        let delta = 39 - event.which;

        // Keyboard arrows up/down have keycodes 38/40
        if (Math.abs(delta) === 1) {
          event.preventDefault();

          if (event.type === "keyup") {
            let date = prop.nonreactive();

            if (_.isDate(date)) {
              this.position = $elem[0].selectionStart;

              if (_.isNumber(this.position)) {
                let is_first = this.position <= 2,
                    is_second = this.position >= 3 && this.position <= 5;

                if (this.hash.monthFirst ? is_second : is_first)
                  date.setDate(date.getDate() + delta);
                else if (this.hash.monthFirst ? is_first : is_second)
                  date.setMonth(date.getMonth() + delta);
                else
                  date.setFullYear(date.getFullYear() + delta);

                this.isGetting = true;

                prop(date);

                Tracker.afterFlush(() => this.isGetting = false);
              }
            }
          }
        }
      }
    }
  },

  // Destroy Pikaday instance to avoid memory leak
  dispose() {
    this.instance.destroy();
  }
});
