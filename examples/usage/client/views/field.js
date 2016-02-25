// Instead of a definition object, a factory function may be used. Unrelated
// to the factory, this viewmodel is also given a name.
Template.usageField.viewmodel("field", function (data) {
  // Return the new viewmodel definition
  return {
    // Primitive property
    myValue: data && data.startValue || "",

    // Computed property
    regex() {
      // Get the value of myValue reactively
      const value = this.myValue();

      return new RegExp(value);
    },

    // React to changes in dependencies such as viewmodel properties
    // – can be an array of functions
    autorun() {
      // Log every time the computed regex property changes
      console.log("New value of regex:", this.regex());
    },
  };
});
