var visitAttributes = TemplateCompiler.prototype.visitAttributes;

// Extend TemplateCompiler
TemplateCompiler.prototype.visitAttributes = function (attrs) {
  if (_.isUndefined(attrs))
    return;

  if (_.isString(attrs))
    return attrs;

  // Rewrite $ attributes directly to dynamic attributes
  _.each(attrs, function (attr) {
    if (attr.name.charAt(0) === "$" && attr.name !== "$dyn") {
      attr.val = attr.name.slice(1) + " " + attr.val;
      attr.name = "$dyn";
    }
  });

  return visitAttributes.call(this, attrs);
};
