dalgard:viewmodel 0.1.1
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`.

- Highly declarative
- Absolutely no redundant syntax
- Reactive and terse API
- Easily extensible


#### Install

*(Atmosphere coming soon)*

Copy the `package` folder (can be renamed) from this repo into your project's `/packages` and add it with `meteor install dalgard:viewmodel`.


## Usage

The example below is a bit verbose; viewmodels do not always have to be declared, but may be created automatically by the `{{bind}}` helper if registered globally.

Check out the other `/examples` in the repo.

```html
<template name="page">
  {{> field}} {{fieldProp}}
</template>

<template name="field">
  <input type="text" {{bind 'value: prop'}}>
</template>
```

```javascript
Template.page.viewmodel({
  // All properties are registered as Blaze helpers
  fieldProp: function () {
    // Get child viewmodel reactively by name
    var field = this.child("field");

    // Child may not be rendered the first time this value is used
    return field && field.prop();
  },

  // Blaze onCreated hook (similar for rendered and destroyed)
  // – can be an array of functions
  created: function () {
    this instanceof ViewModel;  // true
  }
});

Template.field.viewmodel("field", {
  // Primitive property
  prop: "",

  // Computed property
  regex: function () {
    // Get value of prop reactively
    var value = this.prop();

    return new RexExp(value);
  },

  // React to changes in dependencies such as viewmodel properties
  // – can be an array of functions
  autorun: function () {
    // Log every time the computed regex property changes
    console.log("new value of regex", this.regex());
  },

  // Blaze events
  events: {
    "click input": function (event, template_instance) {
      this instanceof ViewModel;  // true
    }
  }
});
```


## API

*(Work in progress)*

### {{bind}}

This Blaze helper is only registered on templates with a declared viewmodel. The name of the helper may be changed:

```javascript
ViewModel.helperName = "myBind"
```

You may choose to register the helper globally:

```javascript
ViewModel.registerHelper(name)  // name is optional
```

The advantage of registering `{{bind}}` globally is that you may use it inside any template without first declaring a viewmodel.

Using the helper then automatically creates a new viewmodel instance (if none existed) and immediately registers the bound key as a Blaze helper – this helper can then be used anywhere *after* the call to `{{bind}}`, but not before. If you want to be able to place a property helper anywhere in the template, declare the viewmodel explicitly.

The syntax of the bind helper looks like this:

```html
{{bind expression ...}}
```

... where `expression` is a string formatted like a key/value pair:

```javascript
'binding: key'
```

You may pass multiple bind expressions to the helper.

Any space separated values placed after the viewmodel key (i.e. the name of a property) inside the bind expression are passed as arguments to the binding – for instance, delay:

```html
<input type="text" {{bind 'value: search 1500'}}>
```

### ViewModel.prototype

ViewModel can be used in a more programmatical way, but below are the methods that are recommended for use inside properties, autoruns etc. when using a declarative approach.

*Templates:*

```javascript
// Get the current template instance
this.templateInstance();

// Reactively get the data context of the current template instance
this.getData();
```

*Serialization:*

```javascript
// Get a snapshot of the viewmodel, ready for serialization
this.serialize();

// Apply a snapshot to the viewmodel
this.deserialize(object);
```

*Traversal:*

```javascript
// Get the parent viewmodel filtered by name (string or regex)
this.parent([name]);

// Get the first ancestor viewmodel at index filtered by name (string or regex)
this.ancestor([name][, index=0]);

// Get an array of ancestor viewmodels or the first at index (within a depth of levels), optionally filtered by name (string or regex)
this.ancestors([name][, index][, levels]);

// Get the first child viewmodel at index filtered by name (string or regex)
this.child([name][, index]);

// Get an array of descendant viewmodels or the first at index (within a depth of levels), optionally filtered by name (string or regex)
this.children([name][, index]);

// Get the first descendant viewmodel at index filtered by name (string or regex)
this.descendant([name][, index=0]);

// Get an array of descendant viewmodels or the first at index (within a depth of levels), optionally filtered by name (string or regex)
this.descendants([name][, index][, levels]);
```


### Static methods

-


### Todo

- Persist viewmodels on hot code pushes.
- Optionally persist viewmodel across routes.
- Optionally register bindings as individual helpers.
