Package.describe({
  name: "dalgard:viewmodel-jade",
  version: "0.5.9",
  summary: "Version of dalgard:viewmodel with an extension for Jade",
  git: "https://github.com/dalgard/meteor-viewmodel-jade",
  documentation: "../README.md"
});

Package.registerBuildPlugin({
  name: "viewmodelCompileJade",

  // Marked dependencies copied directly from mquandalle:jade
  use: [
    "underscore@1.0.0",               //*
    "htmljs@1.0.0",                   //*
    "minifiers@1.0.0",                //*
    "spacebars-compiler@1.0.0",       //*
    "mquandalle:jade-compiler@0.4.3"
  ],

  // Marked sources copied directly from mquandalle:jade
  sources: [
    "lib/transpilers.js",
    "plugin/handler.js"               //*
  ]
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.1.0.3");

  api.imply([
    "dalgard:viewmodel@0.5.9"
  ]);
});
