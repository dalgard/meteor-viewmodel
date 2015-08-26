Template.throttled.viewmodel(function (template_data) {
  // Return a definition object from this factory
  return {
    value: template_data && template_data.startValue || ""
  };
});
