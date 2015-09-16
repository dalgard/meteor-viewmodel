// Declare a viewmodel on this template
Template.usage.viewmodel({
  // All properties are registered as Blaze helpers
  myFieldValue: function () {
    // Get child viewmodel reactively by name
    var field = this.child("field");

    // Get the value of the myValue property if/when the field is rendered
    return field && field.myValue();
  },

  // Blaze onCreated hook (similar for rendered and destroyed)
  // – can be an array of functions
  created: function () {
    // `this` refers to the current viewmodel instance
  }
}, {});  // An options object may be passed
