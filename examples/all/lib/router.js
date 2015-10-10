FlowRouter.route("/:route?", {
  action(params) {
    BlazeLayout.render("layout", { params: params });
  }
});
