Template.full.viewmodel({
  destroy: false,

  childValue() {
    // Get child viewmodel reactively
    const child = this.child("value");

    // Child may not be ready when this value is used
    if (child)
      return child.value();
  },

  autorun() {
    const child = this.child("value");

    if (child)
      console.log("page autorun", child.value());
  },
}, {
  // Persist this viewmodel and descendant viewmodels across re-rendering
  persist: true,
});
