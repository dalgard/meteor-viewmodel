Template.page.viewmodel({
  childValue: function () {
    var child = this.child();

    return child && child.value();
  },

  autorun: function () {
    console.log("page autorun", this.child().value());
  }
});
