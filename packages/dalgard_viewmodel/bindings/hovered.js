ViewModel.addBinding("hovered", {
  init() {
    this.delayEnter = this.args[1];
    this.delayLeave = this.args[2] || this.delayEnter;

    _.each(["delayEnter", "delayLeave"], key => {
      if (_.isObject(this.hash))
        this[key] = this.hash[key] || this.hash.delay || this[key];

      this[key] = parseInt(this[key], 10);
    });
  },

  on: "mouseenter mouseleave",

  get(event, elem, prop) {
    clearTimeout(this.enterId);
    clearTimeout(this.leaveId);

    if (event.type === "mouseenter") {
      if (!this.delayEnter)
        return true;

      this.enterId = setTimeout(() => prop(true), this.delayEnter);
    }
    else {
      if (!this.delayLeave)
        return false;

      this.leaveId = setTimeout(() => prop(false), this.delayLeave);
    }
  },
});
