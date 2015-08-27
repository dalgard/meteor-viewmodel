Template.page.viewmodel({
  destroy: false,

  childValue: function () {
    // Get child viewmodel reactively
    var child = this.child("value");

    // Child may not be ready when this value is used
    if (child)
      return child.value();
  },

  autorun: function () {
    var child = this.child("value");

    if (child)
      console.log("page autorun", child.value());
  }
}, true);  // Persist this viewmodel and descendant viewmodels across re-rendering
