FlowRouter.route("/:route?", {
  action: function (params) {
    BlazeLayout.render("layout", { params: params });
  }
});
