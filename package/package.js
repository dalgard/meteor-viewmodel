Package.describe({
  name: "dalgard:viewmodel",
  version: "0.5.2",
  summary: "Minimalist VM for Meteor – inspired by manuel:viewmodel and nikhizzle:session-bind"
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.1.0.3");

  api.use("grigio:babel@0.1.7");

  api.use([
    "reactive-var",
    "reactive-dict",
    "sha",
    "blaze",
    "stevezhu:lodash@3.10.1"
  ], "client");

  api.addFiles([
    "lib/viewmodel.es6.js",
    "lib/hooks.es6.js"
  ], "client");

  api.addFiles([
    "bindings/checked.js",
    "bindings/click.js",
    "bindings/disabled.js",
    "bindings/files.js",
    "bindings/focused.js",
    "bindings/hovered.js",
    "bindings/key.js",
    "bindings/enter-key.js",
    "bindings/submit.js",
    "bindings/toggle.js",
    "bindings/value.js"
  ], "client");

  api.export("ViewModel", "client");
});
