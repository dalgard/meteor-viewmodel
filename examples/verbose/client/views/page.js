Template.page.viewmodel({
  autorun: function () {
    console.log("page autorun", this.child().value());
  }
});
