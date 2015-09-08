// Instead of a definition object, a factory function may be used. Unrelated
// to the factory, this viewmodel is also given a name.
Template.field.viewmodel("field", function (template_data) {
  var start_value = template_data && template_data.startValue || "";

  // Return the new viewmodel definition
  return {
    // Primitive property
    myValue: start_value,

    // Computed property
    regex: function () {
      // Get value of prop reactively
      var value = this.myValue();

      return new RexExp(value);
    },

    // React to changes in dependencies such as viewmodel properties
    // – can be an array of functions
    autorun: function () {
      // Log every time the computed regex property changes
      console.log("New value of regex:", this.regex());
    },

    // Blaze events. If you use this, chances are you are not using this package
    // in an optimal way – use bindings instead.
    events: {
      "click input": function (event, template_instance) {
        // `this` refers to the current viewmodel instance
      }
    }
  };
});
