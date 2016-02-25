ViewModel.addBinding("key", {
  on: "keyup",

  get(event, elem, prop) {
    const use_hash = _.isNumber(_.isObject(this.hash) && this.hash.keyCode);
    const key_code = use_hash ? this.hash.keyCode : parseInt(this.args[1], 10);
    const key = event.key || event.keyCode || event.keyIdentifier;

    if (key === key_code)
      prop(event, this.args, this.hash);
  },
});
