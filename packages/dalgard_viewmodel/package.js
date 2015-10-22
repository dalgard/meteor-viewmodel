Package.describe({
  name: "dalgard:viewmodel",
  version: "0.9.3",
  summary: "Minimalist VM for Meteor",
  git: "https://github.com/dalgard/meteor-viewmodel",
  documentation: "../../README.md"
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.2.0.2");

  api.use("kadira:flow-router@2.0.0", "client", { weak: true });

  api.use([
    "ecmascript",
    "sha",
    "check",
    "blaze",
    "templating",
    "jquery",
    "tracker",
    "ejson",
    "reactive-var",
    "reactive-dict",
    "stevezhu:lodash@3.10.1",
    "dalgard:reactive-map@0.1.0"
  ], "client");

  api.addFiles([
    "lib/utils.js",
    "lib/list.js",
    "lib/base.js",
    "lib/binding.js",
    "lib/property.js",
    "lib/nexus.js",
    "lib/viewmodel.js"
  ], "client");

  api.addFiles([
    "bindings/checked.js",
    "bindings/class.js",
    "bindings/click.js",
    "bindings/disabled.js",
    "bindings/enter-key.js",
    "bindings/files.js",
    "bindings/focused.js",
    "bindings/hovered.js",
    "bindings/key.js",
    "bindings/pikaday.js",
    "bindings/radio.js",
    "bindings/submit.js",
    "bindings/toggle.js",
    "bindings/value.js"
  ], "client");

  api.export("ViewModel", "client");
});
