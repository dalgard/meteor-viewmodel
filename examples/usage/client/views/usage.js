// Declare a viewmodel on this template (all properties are registered as Blaze helpers)
Template.usage.viewmodel({
  // Computed property from child viewmodel
  myFieldValue() {
    // Get child viewmodel reactively by name
    let field = this.child("field");

    // Get the value of myValue reactively when the field is rendered
    return field && field.myValue();
  }
}, {});  // An options object may be passed
