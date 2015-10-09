ViewModel.addBinding("key", {
  on: "keyup",

  get(event, $elem, prop) {
    let use_hash = _.isNumber(_.isObject(this.hash) && this.hash.keyCode),
        key_code = use_hash ? this.hash.keyCode : parseInt(this.args[1], 10);

    if (event.keyCode === key_code)
      prop(event, this.args, this.hash);
  }
});
