Template.full.viewmodel({
  destroy: false,

  childValue() {
    // Get child viewmodel reactively
    let child = this.child("value");

    // Child may not be ready when this value is used
    if (child)
      return child.value();
  },

  autorun() {
    let child = this.child("value");

    if (child)
      console.log("page autorun", child.value());
  }
}, { persist: true });  // Persist this viewmodel and descendant viewmodels across re-rendering
