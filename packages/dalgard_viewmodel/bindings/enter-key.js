ViewModel.addBinding("enterKey", {
  on: "keyup",

  get(event, elem, prop) {
    const key = event.key || event.keyCode || event.keyIdentifier;

    if (key === 13)
      prop(event, this.args, this.hash);
  },
});
