Template.page.viewmodel({
  childValue: function () {
    // Get child viewmodel reactively
    var child = this.child();

    // Child may not be ready when this value is used
    return child && child.value();
  },

  // Runs onRendered
  autorun: function () {
    // All child viewmodels will be ready
    console.log("page autorun", this.child().value());
  }
});
