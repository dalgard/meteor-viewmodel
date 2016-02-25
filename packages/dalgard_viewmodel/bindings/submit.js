ViewModel.addBinding("submit", {
  on: "submit",

  get(event, elem, prop) {
    const use_hash = _.isBoolean(_.isObject(this.hash) && this.hash.send);
    const send = use_hash ? this.hash.send : this.args[1] === "true";

    if (!send)
      event.preventDefault();

    prop(event, this.args, this.hash);
  },
});
