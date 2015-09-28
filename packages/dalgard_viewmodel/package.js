Package.describe({
  name: "dalgard:viewmodel",
  version: "0.8.1",
  summary: "Minimalist VM for Meteor",
  git: "https://github.com/dalgard/meteor-viewmodel",
  documentation: "../../README.md"
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.1.0.3");

  api.use("grigio:babel@0.1.7");

  api.use([
    "sha",
    "check",
    "blaze",
    "templating",
    "jquery",
    "tracker",
    "ejson",
    "reactive-var",
    "reactive-dict",
    "stevezhu:lodash@3.10.1"
  ], "client");

  api.use("kadira:flow-router@2.0.0", "client", { weak: true });

  api.addFiles("lib/viewmodel.es6.js", "client");

  api.addFiles([
    "bindings/checked.js",
    "bindings/classes.js",
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

  api.addFiles("init.js", "client");
  
  api.export("ViewModel", "client");
});
