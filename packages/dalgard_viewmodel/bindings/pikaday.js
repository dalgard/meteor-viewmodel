ViewModel.addBinding("pikaday", {
  // Initialize Pikaday instance
  init($elem) {
    // Pikaday package must be present
    if (typeof Pikaday !== "function")
      throw new ReferenceError("Pikaday must be present for this binding to work (add richsilv:pikaday)");

    let position = this.hash.position || (this.args[2] ? this.args[1] + " " + this.args[2] : this.args[1]),
        options = {
          field: $elem[0],  // Use DOM element
          format: "DD-MM-YYYY",
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

    // Clear field when the date is cleared
    if (!new_value)
      $elem.val("");

    this.isSetting = false;
  },

  on: "cut paste change",

  get() {
    if (this.isSetting === false)
      return this.instance.getDate();
  },

  // Destroy Pikaday instance to avoid memory leak
  dispose() {
    this.instance.destroy();
  }
});
