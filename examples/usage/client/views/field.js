// Instead of a definition object, a factory function may be used. Unrelated
// to the factory, this viewmodel is also given a name.
Template.usageField.viewmodel("field", function (template_data) {
  var my_value = template_data && template_data.myValue;

  // Return the new viewmodel definition
  return {
    // Primitive property
    myValue: my_value || "",

    // Computed property
    regex: function () {
      // Get the value of myValue reactively
      var value = this.myValue();

      return new RexExp(value);
    },

    // React to changes in dependencies such as viewmodel properties
    // – can be an array of functions
    autorun: function () {
      // Log every time the computed regex property changes
      console.log("New value of regex:", this.regex());
    }
  };
});
