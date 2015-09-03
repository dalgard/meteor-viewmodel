Package.describe({
  name: "dalgard:viewmodel-jade",
  version: "0.6.0",
  summary: "Version of dalgard:viewmodel with an extension for Jade",
  git: "https://github.com/dalgard/meteor-viewmodel-jade",
  documentation: "../README.md"
});

Package.registerBuildPlugin({
  name: "viewmodelCompileJade",

  use: [
    "underscore@1.0.0",               // Copied directly from mquandalle:jade
    "htmljs@1.0.0",                   // Copied directly from mquandalle:jade
    "minifiers@1.0.0",                // Copied directly from mquandalle:jade
    "spacebars-compiler@1.0.0",       // Copied directly from mquandalle:jade
    "mquandalle:jade-compiler@0.4.3"
  ],

  sources: [
    "lib/transpilers.js",
    "plugin/handler.js"               // Copied directly from mquandalle:jade
  ]
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.1.0.3");

  api.imply([
    "dalgard:viewmodel@0.6.0"
  ]);
});
