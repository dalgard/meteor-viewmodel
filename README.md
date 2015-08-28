dalgard:viewmodel 0.3.3
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`.

- Highly declarative
- Terse syntax
- Simple, reactive API
- Easily extensible
- Non-intrusive

(3.05 kB minified and gzipped)


### Install

*Atmosphere coming soon.*

Copy the `package` folder (can be renamed) from this repo into your project's `/packages` and add the package with `meteor install dalgard:viewmodel`.

Browser support is IE9+ because of `Object.defineProperties`. I'll change it if someone complains.


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

The example below is fairly verbose compared with normal use, but demonstrates the core features of ViewModel.

Viewmodel declarations may sometimes be omitted altogether – the `{{bind}}` helper automatically creates what it needs if registered globally (like in the quickstart example).

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
}, options);  // An options object may be passed

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

    // Blaze events. If you use this, chances are you are not using ViewModel
    // in an optimal way – use bindings instead.
    events: {
      "click input": function (event, template_instance) {
        console.log(this instanceof ViewModel);  // true
      }
    }
  };
});
```

Avoid creating a viewmodel on templates that neither contain a `{{bind}}` statement nor use properties from ancestors or descendants. Having too many viewmodels clutters up the global space and makes it more difficult to traverse the hierarchy.

Since traversal methods are reactive, removing and adding viewmodel instances to the page may also result in autoruns running more times than necessary.


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

```javascript
// Get or set the name of the viewmodel
this.name([new_name]);
```

##### Templates

```javascript
// Get the current template instance
this.templateInstance();
```

```javascript
// Reactively get the data context of the current template instance
this.getData();
```

##### Serialization

```javascript
// Get a snapshot of the viewmodel, ready for serialization
this.serialize();
```

```javascript
// Apply a snapshot to the viewmodel
this.deserialize(object);
```

##### Traversal

```javascript
// Reactively get the parent viewmodel, optionally filtered by name (string or regex)
this.parent([name]);
```

```javascript
// Reactively get the first ancestor viewmodel at index, optionally filtered
// by name (string or regex)
this.ancestor([name][, index=0]);
```

```javascript
// Reactively get an array of ancestor viewmodels or the first at index (within
// a depth of levels), optionally filtered by name (string or regex)
this.ancestors([name][, index][, levels]);
```

```javascript
// Reactively get the first child viewmodel at index, optionally filtered
// by name (string or regex)
this.child([name][, index]);
```

```javascript
// Reactively get an array of child viewmodels or the first at index, optionally
// filtered by name (string or regex)
this.children([name][, index]);
```

```javascript
// Reactively get the first descendant viewmodel at index, optionally filtered
// by name (string or regex)
this.descendant([name][, index=0]);
```

```javascript
// Reactively get an array of descendant viewmodels or the first at index (within
// a depth of levels), optionally filtered by name (string or regex)
this.descendants([name][, index][, levels]);
```

### Static methods

These methods are mainly for inspection while developing, but may also be used as a more convenient way of retrieving a component in a complex layout.

```javascript
// Reactively get global list of current viewmodels
ViewModel.all();
```

```javascript
// Reactively get an array of current viewmodels or the first at index, optionally
// filtered by name (string or regex)
ViewModel.find([name][, index]);
```

```javascript
// Reactively get the first current viewmodel at index, optionally filtered by name
// (string or regex)
ViewModel.findOne([name][, index]);
```

### Transclude

To take a viewmodel out of the viewmodel hierarchy, set the `transclude` flag when declaring it:

```javascript
Template.example.viewmodel({
  prop: ""
}, { transclude: true });
```

A viewmodels that is transcluded becomes "invisible" to its parent and its children. Instead, the children of the transcluded viewmodel become children of the transcluded viewmodel's parent.

This is useful when wrapping a component in a template, which has some internal state, but isn't otherwise relevant to the rest of the view.

### Persistence

Values in viewmodel instances are automatically persisted across hot code pushes.

To persist the state of a viewmodel across re-renderings, including changing to another route and going back to a previous one, set the `persist` flag when declaring the viewmodel:

```javascript
Template.example.viewmodel({
  // This property will be restored on re-render
  prop: ""
}, { persist: true });
```

In order to determine whether an instance is the same as a previous one, ViewModel looks at 1) the position of the viewmodel in the view hierarchy, 2) the index of the viewmodel in relation to other current viewmodels, and 3) the browser location.

If all these things match, the state of the viewmodel instance will be restored.

**Important:** Any viewmodel that is a direct child or descendant of a viewmodel that is persisted across re-rendering is persisted in the same way.


## Bindings

Several standard bindings are included with the package.

Viewmodel declarations and template names are omitted below in order to make the examples easier to read. Arguments are shown in parentheses.

#### Value ([throttle])

The `text` property reflects the value of a text input, textarea, or select.

An initial value can be set in the viewmodel. The throttle argument is a number (in ms) by which the update is [delayed](https://lodash.com/docs#throttle) as long as the user is typing.

```html
<input type="text" {{bind 'value: text 100'}}>
```

```javascript
{ text: "" }
```

#### Checked

The `checked` property reflects the state of the checkbox. The inital state of the checkbox can be set in the viewmodel.

```html
<input type="checkbox" {{bind 'checked: checked'}}>
```

```javascript
{ checked: false }
```

#### Click

A function on the viewmodel is run when the element is clicked.

```html
<button {{bind 'click: click'}}></button>
```

```javascript
{ click: function (event, $elem, args, kwhash) {} }
```

#### Toggle

The `toggled` property is negated on each `click` of the button.

```html
<button {{bind 'toggle: toggled'}}></button>
```

```javascript
{ toggled: false }
```

#### Submit ([send])

A function on the viewmodel is run when the form is submitted. If `true` is passed as the send argument in the binding, the event does **not** get `event.preventDefault()`, meaning that the form will be sent.

```html
<form {{bind 'submit: submit true'}}></form>
```

```javascript
{ submit: function (event, $elem, args, kwhash) {} }
```

#### Disabled

The disabled state of the element reflects a boolean property on the viewmodel. The inital state can be set in the viewmodel.

```html
<input type="text" {{bind 'disabled: disabled'}}>
```

```javascript
{ disabled: false }
```

#### Focused

The `focused` property reflects whether the element is in focus. An element can be given focus by setting the initial state to `true`.

```html
<input type="text" {{bind 'focused: focused'}}>
```

```javascript
{ focused: true }
```

#### Hovered

The `hovered` property reflects whether the mouse hovers over the element.

```html
<button {{bind 'hovered: hovered'}}></button>
```

```javascript
{ hovered: false }
```

#### Enter key

A function on the viewmodel is run when the enter key is pressed on the element.

```html
<input type="text" {{bind 'enterKey: pressed'}}>
```

```javascript
{ pressed: function (event, $elem, args, kwhash) {} }
```

#### Key (keyCode)

A function on the viewmodel is run when the specific key, passed as an argument, is pressed on the element. In the example, it's the shift key.

```html
<input type="text" {{bind 'key: pressed 16'}}>
```

```javascript
{ pressed: function (event, $elem, args, kwhash) {} }
```

#### Files

The `files` property is an array of the currently selected file object(s) from the file picker. The boolean attribute `multiple` is optional on the input element.

```html
<input type="file" multiple {{bind 'files: files'}}>
```

```javascript
{ files: [] }
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
// All four properties on the definition object are optional
ViewModel.addBinding(name, {
  // Almost always omitted. If true, the binding doesn't need a viewmodel, and
  // consequently, viewmodels or properties will not be created automatically,
  // and the get and set functions are called with the view as contex instead
  // of a viewmodel.
  free: false,

  // Space separated list of events
  on: "keyup input change",

  // Get a value from the DOM
  get: function (event, $elem, key, args, kwhash) {
    // For example
    return $elem.val();
  },

  // Apply a new value to the DOM
  set: function ($elem, new_value, args, kwhash) {
    // For example
    $elem.val(new_value);
  }
});
```

The parameters for `get` and `set` are:

- `event` – the original (jQuery) event object.
- `$elem` – the element that the `{{bind}}` helper was called on, wrapped in jQuery.
- `new_value` – the new value that was passed to the property.
- `key` – the name of the property.
- `args` – an array (possibly empty) containing any space separated values that came after the key in the bind expression.
- `kwhash` – the hash object from the Spacebars keyword arguments that the `{{bind}}` helper was called with.

The returned value from the `get` function is written directly to the bound property. However, if the function doesn't return anything (i.e. returns `undefined`), the bound property is not called at all. This is practical in case you only want to call the bound property in *some* cases.

An example:

```javascript
ViewModel.addBinding("enterKey", {
  on: "keyup",

  // This function doesn't return anything but calls the property explicitly instead
  get: function (event, $elem, key, args, kwhash) {
    if (event.which === 13)
      this[key](event, $elem, args, kwhash);
  }
});
```

In the case where you want to call the bound property, but not do so with a new value, simply omit the `get` function altogether – like with the `click` binding. The bound property will then be called with the same arguments as the `get` function.

A definition object may also be returned from a factory function, which is called with the view as context and some useful arguments:

```javascript
ViewModel.addBinding(name, function (template_data, key, args, kwhash) {
  // Return definition object
  return {};
});
```


## Todo

- ~~Persist viewmodels on hot code pushes~~
- ~~Optionally persist viewmodel across routes~~
- ~~Optionally transclude viewmodel~
- Optionally share state between two instances of the same viewmodel
