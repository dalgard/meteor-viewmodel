dalgard:viewmodel 0.1.0
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`

- Highly declarative
- Absolutely no redundant syntax
- Reactive
- Simple API
- Easily extensible


#### Install

*Coming soon*

~~`meteor install dalgard:viewmodel`~~


## Usage

*Work in progress*

```javascript
Template.mytemplate.viewmodel({
  // Primitive property
  myprop: "",

  // Computed property
  regex: function () {
    // Get value of myprop reactively
    var value = this.myprop();

    return new RexExp(value);
  },

  // React to changes in dependencies such as viewmodel properties
  // – can be an array of functions
  autorun: function () {
    // Log every time the computed regex property changes
    console.log("new value of regex", this.regex());
  },

  // Blaze onCreated hook (rendered and destroyed also exist)
  // – can be an array of functions
  created: function () {
    this instanceof ViewModel;  // true
  },

  // Blaze events
  events: {
    "click input": function (event, template_instance) {
      this instanceof ViewModel;  // true
    }
  }
});
```

```html
<template name="mytemplate">
  <input type="text" {{bind 'value: myprop'}}>
</template>
```

Check out the examples.


## API

*Work in progress*

- {{bind}} helper (multiple, arguments) (global: helper must be used after bind)
- ViewModel.prototype
- static ViewModel


## Todo

- Persist viewmodels on hot code pushes
- Optionally persist viewmodel across routes
- Optionally register bindings as individual helpers
