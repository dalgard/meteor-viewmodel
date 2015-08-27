dalgard:viewmodel 0.2.0
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`.

- Highly declarative
- Terse syntax
- Simple, reactive API
- Easily extensible
- Non-intrusive

(2.68 kB minified and gzipped)


### Install

*Atmosphere coming soon.*

Copy the `package` folder (can be renamed) from this repo into your project's `/packages` and add it with `meteor install dalgard:viewmodel`.

At this moment, browser support is IE9+, because I was tempted to use `Object.defineProperties`, because it made things easier. Do complain...


### Contents

*Generated with [DocToc](https://github.com/thlorenz/doctoc).*

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Quickstart](#quickstart)
- [Usage](#usage)
- [API](#api)
  - [{{bind}}](#bind)
  - [Viewmodel instances](#viewmodel-instances)
      - [Templates](#templates)
      - [Serialization](#serialization)
      - [Traversal](#traversal)
  - [Static methods](#static-methods)
  - [Persistence](#persistence)
- [Bindings](#bindings)
  - [Value ([throttle])](#value-throttle)
  - [Checked](#checked)
  - [Click](#click)
  - [Toggle](#toggle)
  - [Submit ([boolean])](#submit-boolean)
  - [Disabled](#disabled)
  - [Focused](#focused)
  - [Hovered](#hovered)
  - [Enter key](#enter-key)
  - [Key (keyCode)](#key-keycode)
  - [Files](#files)
- [addBinding](#addbinding)
- [Todo](#todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Quickstart

```javascript
// All the code you need to get started
ViewModel.registerHelper("bind");
```

```html
<template name="example">
  <input type="text" {{bind 'value: text'}}>
  <input type="checkbox" {{bind 'checked: show'}}>

  {{#if show}}
    {{text}}
  {{/if}}
</template>
```


## Usage

The example below is fairly verbose, the point being to demonstrate some of the features of ViewModel.

Besides usually being much more concise, viewmodels in some cases don't have to be declared at all – they may be created automatically by the `{{bind}}` helper if the helper is registered globally, like in the quickstart example.

Check out the other `/examples` in the repo.

```html
<template name="page">
  {{> field startValue='yo'}} {{fieldProp}}
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

    // Child may not be ready the first time around
    return field && field.prop();
  },

  // Blaze onCreated hook (similar for rendered and destroyed)
  // – can be an array of functions
  created: function () {
    console.log(this instanceof ViewModel);  // true
  }
});

// Instead of a definition object, a factory function may be used. Unrelated
// to the factory, this viewmodel is also given a name.
Template.field.viewmodel("field", function (template_data) {
  var start_value = template_data && template_data.startValue || "";

  return {
    // Primitive property
    prop: start_value,

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
        console.log(this instanceof ViewModel);  // true
      }
    }
  };
});
```


## API

This is an extract of the full API – take five minutes to explore the ViewModel class with `dir(ViewModel)` and viewmodel instances with `debugger` or `ViewModel.all()` in your dev tools of choice.

### {{bind}}

As a starting point, the Blaze bind helper only gets registered on templates with a declared viewmodel. The name of the helper may be changed like this:

```javascript
ViewModel.helperName = "myBind";
```

However, you may choose to register the helper globally:

```javascript
ViewModel.registerHelper(name);  // name is optional
```

The advantage of registering `{{bind}}` globally is that you may use it inside any template without first declaring a viewmodel.

The helper then automatically creates a new viewmodel instance (if none existed) on the template and immediately registers the bound key as a Blaze helper – this helper can then be used anywhere *after* the call to `{{bind}}`, but not before. If you want to be able to place a property helper *anywhere* in the template, declare the viewmodel explicitly.

The syntax of the bind helper looks like this:

```html
{{bind expression ...}}
```

... where `expression` is a string formatted as a key/value pair:

```javascript
'binding: key'
```

You may pass multiple bind expressions to the helper.

Any space separated values placed after the viewmodel key (i.e. the name of a property) inside the bind expression are passed as arguments to the binding – for instance, delay:

```html
<input type="text" {{bind 'value: search 1500'}}>
```

### Viewmodel instances

ViewModel can be used in a more programmatical way, but below are the methods that are recommended for use inside computed properties, autoruns etc. when sticking to a declarative approach.

##### Templates

Get the current template instance:

```javascript
this.templateInstance();
```

Reactively get the data context of the current template instance:

```javascript
this.getData();
```

##### Serialization

Get a snapshot of the viewmodel, ready for serialization:

```javascript
this.serialize();
```

Apply a snapshot to the viewmodel:

```javascript
this.deserialize(object);
```

##### Traversal

Reactively get the parent viewmodel, optionally filtered by name (string or regex):

```javascript
this.parent([name]);
```

Reactively get the first ancestor viewmodel at index, optionally filtered by name (string or regex):

```javascript
this.ancestor([name][, index=0]);
```

Reactively get an array of ancestor viewmodels or the first at index (within a depth of levels), optionally filtered by name (string or regex):

```javascript
this.ancestors([name][, index][, levels]);
```

Reactively get the first child viewmodel at index, optionally filtered by name (string or regex):

```javascript
this.child([name][, index]);
```

Reactively get an array of descendant viewmodels or the first at index (within a depth of levels), optionally filtered by name (string or regex):

```javascript
this.children([name][, index]);
```

Reactively get the first descendant viewmodel at index, optionally filtered by name (string or regex):

```javascript
this.descendant([name][, index=0]);
```

Reactively get an array of descendant viewmodels or the first at index (within a depth of levels), optionally filtered by name (string or regex):

```javascript
this.descendants([name][, index][, levels]);
```

### Static methods

These methods are mainly for inspection while developing, but may also be used as a means of retrieving a component somewhere in a complex layout.

Reactively get global list of current viewmodels:

```javascript
ViewModel.all();
```

Reactively get an array of current viewmodels or the first at index, optionally filtered by name (string or regex):

```javascript
ViewModel.find([name][, index]);
```

Reactively get the first current viewmodel at index, optionally filtered by name (string or regex):

```javascript
ViewModel.findOne([name][, index]);
```

### Persistence

Values in viewmodel instances are automatically persisted across hot code pushes.

To persist the state of a viewmodel across re-renderings, including changing to another route and going back to a previous view, pass `true` as the last argument when declaring a new viewmodel:

```javascript
Template.example.viewmodel({
  // This value will be restored
  value: ""
}, true);
```

In order to determine whether an instance is the same as previous, ViewModel looks at 1) the position of the viewmodel in the view hierarchy, 2) the index of the viewmodel in relation to other current viewmodels, and 3) the browser location.

If all these things match, the state of the viewmodel instance will be restored.


## Bindings

Several standard bindings are included with the package.

Viewmodel declarations and template names are omitted below in order to make the examples easier to read. Arguments are shown in parentheses.

### Value ([throttle])

The `text` property reflects the value of a text input, textarea, or select.

An initial value can be set in the viewmodel. The throttle argument is a number (in ms) by which the update is [delayed](https://lodash.com/docs#throttle) as long as the user is typing.

```javascript
{ text: "" }
```

```html
<input type="text" {{bind 'value: text 100'}}>
```

### Checked

The `checked` property reflects the checked state of the checkbox. The inital state of the checkbox can be set in the viewmodel.

```javascript
{ checked: false }
```

```html
<input type="checkbox" {{bind 'checked: checked'}}>
```

### Click

A function on the viewmodel is run when the element is clicked.

```javascript
{ click: function (event, elem, args, kwargs) {} }
```

```html
<button {{bind 'click: click'}}></button>
```

### Toggle

The `toggled` property is negated on each `click` of the button.

```javascript
{ toggled: false }
```

```html
<button {{bind 'toggle: toggled'}}></button>
```

### Submit ([boolean])

A function on the viewmodel is run when the form is submitted. If `true` is passed as an argument in the binding, the event does **not** get `event.preventDefault()`, meaning that the form will be sent.

```javascript
{ submit: function (event, elem, args, kwargs) {} }
```

```html
<form {{bind 'submit: submit true'}}></form>
```

### Disabled

The disabled state of the element reflects a boolean property on the viewmodel. The inital state can be set in the viewmodel.

```javascript
{ disabled: false }
```

```html
<input type="text" {{bind 'disabled: disabled'}}>
```

### Focused

The `focused` property reflects whether the element is in focus. An element can be given focus by setting the initial state to `true`.

```javascript
{ focused: true }
```

```html
<input type="text" {{bind 'focused: focused'}}>
```

### Hovered

The `hovered` property reflects whether the mouse hovers over the element.

```javascript
{ hovered: false }
```

```html
<button {{bind 'hovered: hovered'}}></button>
```

### Enter key

A function on the viewmodel is run when the enter key is pressed on the element.

```javascript
{ pressed: function (event, elem, args, kwargs) {} }
```

```html
<input type="text" {{bind 'enterKey: pressed'}}>
```

### Key (keyCode)

A function on the viewmodel is run when the specific key, passed as an argument, is pressed on the element. In the example, it's the shift key.

```javascript
{ pressed: function (event, elem, args, kwargs) {} }
```

```html
<input type="text" {{bind 'key: pressed 16'}}>
```

### Files

The `files` property is an array of the currently selected file object(s) from the file picker. The boolean attribute `multiple` is optional on the input element.

```javascript
{ files: [] }
```

```html
<input type="file" multiple {{bind 'files: files'}}>
```


## addBinding

This is the full definition of the `click` binding:

```javascript
ViewModel.addBinding("click", {
  on: "click"
});
```

The job of a binding is to synchronize data between the DOM and the viewmodel. Bindings are added through definition objects:

```javascript
// All three properties on the definition object are optional
ViewModel.addBinding(name, {
  // Apply updated value to the DOM
  set: function ($elem, new_value, args, kwargs) {
    // For example
    $elem.val(new_value);
  };

  // Space separated list of events
  on: "keyup input change",

  // Possibly return a value retrieved from the DOM
  get: function (event, $elem, prop, args, kwargs) {
    // For example
    return $elem.val();
  }
});
```

- `$elem` is the element where the `{{bind}}` helper was called, wrapped in jQuery.
- `prop` is the getter-setter of the viewmodel property, which sometimes will simply be a method with side effects on the viewmodel.
- `args` is a, possibly empty, array containing any space separated values that came after the key in the bind expression.
- `kwargs` contains the keyword arguments that the `{{bind}}` helper was called with.

The returned value from the `get` function is written directly to the bound property. However, if the function doesn't return anything (i.e. returns `undefined`), the bound property is not called at all. This is practical in case you only want to call the bound property in *some* cases.

Here's an example:

```javascript
ViewModel.addBinding("enterKey", {
  on: "keyup",

  // This function doesn't return anything but calls the property explicitly instead
  get: function (event, elem, prop) {
    if (event.which === 13)
      prop();
  }
});
```

In the case where you want to call the bound property, but not do so with a new value, simply omit the `get` function altogether – like with the `click` binding. The bound property will then be called with the arguments `event, elem, args, kwargs`.

A definition object may also be returned from a factory function, which is called with some useful arguments:

```javascript
ViewModel.addBinding(name, function (template_data, key, args, kwargs) {
  // Return definition object
  return {};
});
```


## Todo

- Optionally persist viewmodel across routes
- Optionally register bindings as individual helpers (?)
