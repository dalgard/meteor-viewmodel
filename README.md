dalgard:viewmodel 0.1.0
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`

- Highly declarative
- Absolutely no redundant syntax
- Reactive and terse API
- Easily extensible


#### Install

*(Atmosphere coming soon)*

Copy the `package` folder (can be renamed) from this repo into your project's `/packages` and add it with `meteor install dalgard:viewmodel`.


## Usage

*(Work in progress)*

Check out the other `/examples` in the repo.

```html
<template name="page">
  {{> field}}
</template>

<template name="field">
  <input type="text" {{bind 'value: prop'}}>
</template>
```

```javascript
Template.page.viewmodel({
  // React to changes in dependencies such as viewmodel properties
  // – can be an array of functions
  autorun: function () {
    // Get child viewmodel by name
    var field = this.child("field");

    // Log every time the computed regex property changes
    console.log("new value of regex", field.regex());
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

- {{bind}} helper (multiple, arguments) (global: helper must be used after bind)
- ViewModel.prototype
- static ViewModel


### Todo

- Persist viewmodels on hot code pushes
- Optionally persist viewmodel across routes
- Optionally register bindings as individual helpers
