// Attach declaration hook to Blaze templates
Template.prototype.viewmodel = ViewModel.viewmodelHook;

// Restore viewmodel values after a hot code push
if (ViewModel.restoreAfterHCP) {
  // Body is created as the first event after hot code push
  Template.body.onCreated(_.partial(ViewModel._isHCP, true));

  // Body is done rendering as the last event after hot code push
  Template.body.onRendered(_.partial(ViewModel._isHCP, false));
}
