// Attach declaration hook to Blaze templates
Blaze.Template.prototype.viewmodel = ViewModel.viewmodelHook;

// Restore viewmodel values after a hot code push
if (ViewModel.restoreAfterHCP)
  Template.body.onRendered(ViewModel._restoreAll);
