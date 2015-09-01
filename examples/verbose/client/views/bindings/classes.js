Template.classes.viewmodel({
  red: false,

  classes: function () {
    return { red: this.red() };
  }
});
