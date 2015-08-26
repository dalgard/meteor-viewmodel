Template.page.viewmodel({
  childValue: function () {
    // Get child viewmodel reactively
    var child = this.child();

    // Child may not be ready when this value is used
    return child && child.value();
  },

  // Runs onRendered – all child viewmodels are ready
  autorun: function () {
    console.log("page autorun", this.child().value());
  }
});
