dalgard:viewmodel 0.7.0
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`.

- Highly declarative
- Terse syntax
- Simple, reactive API
- Easily extensible
- Non-intrusive

(4.54 kB minified and gzipped)

### Install

`meteor add dalgard:viewmodel`

If you are migrating from `manuel:viewmodel` or want to try both packages side by side, read the [Migration](#migration) section.

### Contents

*Generated with [DocToc](https://github.com/thlorenz/doctoc).*

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Intro](#intro)
- [Quickstart](#quickstart)
- [Usage](#usage)
  - [Jade](#jade)
- [API](#api)
  - [{{bind}}](#bind)
  - [Viewmodel instances](#viewmodel-instances)
      - [Templates](#templates)
      - [Serialization](#serialization)
      - [Traversal](#traversal)
  - [Static methods](#static-methods)
  - [Transclude](#transclude)
  - [Persistence](#persistence)
  - [Shared state](#shared-state)
- [addBinding](#addbinding)
- [Built-in bindings](#built-in-bindings)
    - [Value ([throttle])](#value-throttle)
    - [Checked](#checked)
    - [Radio](#radio)
    - [Datepicker ([position])](#datepicker-position)
    - [Click](#click)
    - [Toggle](#toggle)
    - [Submit ([send])](#submit-send)
    - [Disabled](#disabled)
    - [Focused](#focused)
    - [Hovered](#hovered)
    - [Enter key](#enter-key)
    - [Key (keyCode)](#key-keycode)
    - [Classes](#classes)
    - [Files](#files)
- [Migration](#migration)
- [History](#history)
  - [Todo](#todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Intro

A modern webapp typically consists of various components, tied together in a view hierarchy. Some of these components have state, some of them expose a value, and some have actions.

Examples:

- A filter panel, which might be folded or unfolded and expose a regex depending on an input field.
- A pagination widget, which might have a currently selected page, expose an index range, and have the ability to change page.
- A login form with username, password, and a submit button, which logs in the user.

Traditionally, the state of a component is held implicitly in the DOM. An element that is hidden simply has `display: none`. Values are retrieved manually upon use, and events are registered manually – in both cases through an element's class or id.

With the viewmodel pattern, the state, value, and methods of a component is stored in an object – the component's **viewmodel** – which can be persisted across sessions or routes and read or written to by other components. The state and values in the viewmodel are automatically synchronized between this object and the DOM through something called **bindings**.

This principle reduces the amount of code in a project, because bindings are declarative, and at the same time makes components more loosely coupled, because other parts of the view hierarchy don't have to know about a component's actual markup.

The goal of `dalgard:viewmodel` is to cut down to the core of this pattern and provide the leanest possible API for gaining the largest possible advantage from it.


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
    <button {{bind 'toggle: red'}}>Toggle red</button>
    <p style="{{#if red}}color: red;{{/if}}">{{text}}</p>
  {{/if}}
</template>
```


## Usage

The example below demonstrates the core features of the package.

Viewmodel declarations may sometimes be omitted altogether – the `{{bind}}` helper automatically creates what it needs, if registered globally (like in the quickstart example).

Check out the other `/examples` in the repo.

```html
<template name="page">
  {{> field startValue='Hello world'}} {{myFieldValue}}
</template>

<template name="field">
  <input type="text" {{bind 'value: myValue'}}>
</template>
```

```javascript
// Declare a viewmodel on this template (all properties are registered as Blaze helpers)
Template.page.viewmodel({
  // Computed property from child viewmodel
  myFieldValue: function () {
    // Get child viewmodel reactively by name
    var field = this.child("field");

    // Get the value of myValue reactively when the field is rendered
    return field && field.myValue();
  }
}, options);  // An options object may be passed

// Instead of a definition object, a factory function may be used. Unrelated
// to the factory, this viewmodel is also given a name.
Template.field.viewmodel("field", function (template_data) {
  var my_value = template_data && template_data.myValue;

  // Return the new viewmodel definition
  return {
    // Primitive property
    myValue: my_value || "",

    // Computed property
    regex: function () {
      // Get the value of myValue reactively
      var value = this.myValue();

      return new RexExp(value);
    },

    // React to changes in dependencies such as viewmodel properties
    // – can be an array of functions
    autorun: function () {
      // Log every time the computed regex property changes
      console.log("New value of regex:", this.regex());
    }
  };
});
```

The viewmodel of a template instance can be accessed inside lifetime hooks (`onCreated`, `onRendered`, and `onDestroyed`) and inside helpers and events, through the `viewmodel` property on the template instance:

```javascript
Template.example.viewmodel({
  myValue: "Hello world"
});

Template.example.onRendered(function () {
  this.viewmodel.myValue();  // "Hello world"
});

// Additional helpers shouldn't be needed in practice, since all viewmodel properties are also registered as Blaze helpers
Template.example.helpers({
  myHelper: function () {
    Template.instance().viewmodel.myValue();  // "Hello world"
  }
});

Template.example.events({
  "click button": function (event, template_instance) {
    template_instance.viewmodel.myValue();  // "Hello world"
  }
});
```

### Jade

To attach a binding in a Jade template, use this syntax:

```jade
button($dyn='{{bind "click: click"}}')
```

Also check out the Jade example in `/examples/jade`.

## API

This is an extract of the full API – take five minutes to explore the ViewModel class with `dir(ViewModel)` and viewmodel instances with `ViewModel.find()` in your dev tools of choice.

### {{bind}}

To begin with, the Blaze bind helper only gets registered on templates with a declared viewmodel. The name of the helper may be changed like this:

```javascript
ViewModel.helperName = "myBind";
```

However, you may choose to register the helper globally:

```javascript
ViewModel.registerHelper(name);  // name is optional
```

The advantage of registering `{{bind}}` globally is that you may use it inside any template without first declaring a viewmodel.

The helper then automatically creates a new viewmodel instance (if none existed) on the template and immediately registers the bound key as a Blaze helper – this helper can then be used anywhere ***after*** the call to `{{bind}}`, but not before. If you want to be able to use a property *anywhere* in the template, declare the viewmodel explicitly.

The basic syntax of the bind helper looks like this:

```html
{{bind expression ...}}
```

... where `expression` is a string, formatted as a key/value pair:

```javascript
'binding: key'
```

You may pass multiple bind expressions to the helper – either inside one string, separated by commas, or as multiple positional arguments.

In special cases, like with the `classes` binding, the key may be omitted or multiple keys may be listed.

Any space separated values after the colon inside the bind expression are passed as arguments to the binding – for instance, key and delay:

```html
<input type="text" {{bind 'value: search 1500'}}>
```

### Viewmodel instances

ViewModel can be used in a more programmatical way, but below are the methods that are recommended for use inside computed properties, autoruns etc. when sticking to a declarative approach.

```javascript
// Reactively get or set the name of the viewmodel
this.name([new_name]);
```

```javascript
// Reactively get or set an option of the viewmodel
this.option(name[, new_value]);
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

```javascript
// Reset the viewmodel to its initial values
this.reset();
```

Individual properties can be reset by calling their reset methods directly:

```javascript
this.myValue.reset();
```

##### Traversal

The recommended pattern with this package is to retrieve values from child viewmodels, rather than having the child viewmodels write values to their parent, as well as to use Spacebars keyword arguments to pass values down to children.

Consequently, the `parent`, `ancestor`, and `ancestors` methods should generally be avoided.

The optional `name` argument in the methods below can either be a string or regex that will be compared to the name of the viewmodel, if present, or it can be a predicate function, which is called with the viewmodel as its first argument.

```javascript
// Reactively get the parent viewmodel, optionally filtered by name
this.parent([name]);
```

```javascript
// Reactively get a single descendant viewmodel, optionally within a depth,
// at an index, and filtered by name
this.ancestor([name][, index=0][, depth]);
```

```javascript
// Reactively get an array of ancestor viewmodels, optionally within a depth
// and filtered by name
this.ancestors([name][, depth]);
```

```javascript
// Reactively get a single child viewmodel, optionally at an index
// and filtered by name
this.child([name][, index=0]);
```

```javascript
// Reactively get an array of child viewmodels, optionally filtered by name
this.children([name]);
```

```javascript
// Reactively get a single descendant viewmodel, optionally within a depth,
// at an index, and filtered by name
this.descendant([name][, index=0][, depth]);
```

```javascript
// Reactively get an array of descendant viewmodels, optionally within a depth
// and filtered by name
this.descendants([name][, depth]);
```

### Static methods

These methods are mainly for inspection while developing, but may also be used as a more convenient way of retrieving a component in a complex layout.

```javascript
// Reactively get an array of current viewmodels, optionally filtered by name
ViewModel.find([name][, index]);
```

```javascript
// Reactively get the first current viewmodel at index, optionally filtered by name
ViewModel.findOne([name][, index]);
```

### Transclude

To take a viewmodel out of the viewmodel hierarchy, set the `transclude` flag when declaring it:

```javascript
Template.example.viewmodel({
  prop: ""
}, { transclude: true });
```

A viewmodel that is transcluded becomes "invisible" to its parent and children. Instead, the children of the transcluded viewmodel become children of the transcluded viewmodel's parent.

This is useful when placing some component in a template, which has its own internal state, but which isn't otherwise relevant to the rest of the view hierarchy.

### Persistence

Values in viewmodel instances are automatically persisted across hot code pushes.

To persist the state of a viewmodel across re-renderings, including changing to another route and going back to a previous one, set the `persist` flag when declaring the viewmodel:

```javascript
Template.example.viewmodel({
  // This property will be restored on re-render
  prop: ""
}, { persist: true });
```

In order to determine whether an instance is the same as a previous one, ViewModel looks at 1) the position of the viewmodel in the view hierarchy, 2) the index of the viewmodel in relation to sibling viewmodels, and 3) the browser location.

If all these things match, the state of the viewmodel instance will be restored.

**Important:** Any viewmodel that is a descendant of a viewmodel that has the `persist` flag set, is persisted in the same way.

### Shared state

Multiple instances of the same viewmodel can share their state – set the `share` flag in the declaration:

```javascript
Template.example.viewmodel({
  prop: ""
}, { share: true });
```

If a component is repeated on a page, the `share` flag makes sure that the state of the two instances is kept in sync automatically. This is useful for something like a pagination widget that is duplicated at the top and bottom of a page.


## addBinding

This is the full declaration of the `click` binding:

```javascript
ViewModel.addBinding("click", {
  on: "click"
});
```

The job of a binding is to synchronize data between the DOM and the viewmodel. Bindings are added through definition objects:

```javascript
// All properties on the definition object are optional
ViewModel.addBinding("name", {
  // Inherit the properties of one or several other bindings (name or array of names)
  extends: "super_name",

  // Omitted in most cases. If true, the binding doesn't use a viewmodel, and
  // consequently, viewmodels or properties will not be created automatically.
  // The get and set functions will be called with the view as contex, instead
  // of a viewmodel.
  detached: false,

  // Run once when the element is rendered, right before the first call to set.
  // Used to initalize things like jQuery plugins. When creating a binding that
  // only contains this init function, set detached: true.
  init: function ($elem, init_value, args, kwhash) {
    // For example
    $elem.myPlugin("init", kwhash.options);
  },

  // Apply the original value and new values to the DOM
  set: function ($elem, new_value, args, kwhash) {
    // For example
    $elem.val(new_value);
  },

  // Space separated list of events
  on: "keyup input change",

  // Get the changed value from the DOM triggered by events
  get: function (event, $elem, prop, args, kwhash) {
    // For example
    return $elem.val();
  },

  // Run once when the view containing the element is destroyed. Used to tear down
  // things like jQuery plugins.
  dispose: function ($elem, prop, args, kwhash) {
    // For example
    $elem.myPlugin("destroy");
    prop.reset();
  }
});
```

The parameters for `init`, `set`, and `get` are:

- `event` – the original (jQuery) event object.
- `$elem` – the element that the `{{bind}}` helper was called on, wrapped in jQuery.
- `init_value`/`new_value` – the new value that was passed to the property.
- `prop` – the property on the viewmodel, if available.
- `args` – an array (possibly empty) containing any space separated values after the colon in the bind expression, including the key.
- `kwhash` – the hash object from the Spacebars keyword arguments that the `{{bind}}` helper was called with.

The returned value from the `get` function is written directly to the bound property. However, if the function doesn't return anything (i.e. returns `undefined`), the bound property is not called at all. This is practical in case you only want to call the bound property in *some* cases.

An example:

```javascript
ViewModel.addBinding("enterKey", {
  on: "keyup",

  // This function doesn't return anything but calls the property explicitly instead
  get: function (event, $elem, prop, args, kwhash) {
    if (event.which === 13)
      // Call prop with these three arguments as standard
      prop(event, args, kwhash);
  }
});
```

In the case where you want to call the bound property, but not do so with a new value, simply omit the `get` function altogether – like with the `click` binding above. The bound property will then be called with the arguments `event`, `args`, and `kwhash`.

A definition object may also be returned from a factory function, which is called with the view as context and some useful arguments:

```javascript
ViewModel.addBinding(name, function (template_data, args, kwhash) {
  // Return definition object
  return {};
});
```

Besides giving access to template data, the factory function creates a scope which can be used for storing variables specific to the bound element, such as a reference to a 3rd party component instance initialized on the element.


## Built-in bindings

Several bindings are included with the package, but you are highly encouraged to add  more specialized bindings to your project in order to improve the readability of the code.

(Boilerplate code is omitted below; possible arguments are shown in parentheses.)

#### Value ([throttle])

The property reflects the value of a text input, textarea, or select. An initial value can be set in the viewmodel. The `throttle` argument, optionally passed as a keyword argument, is a number (in ms) by which the update is [delayed](https://lodash.com/docs#throttle) as long as the user is typing.

```html
<input type="text" {{bind 'value: text 100'}}>
```

```javascript
{ text: "" }
```

#### Checked

The property reflects the state of the checkbox. The inital state of the checkbox can be set in the viewmodel.

```html
<input type="checkbox" {{bind 'checked: checked'}}>
```

```javascript
{ checked: false }
```

#### Radio

The property reflects the value of the radio button. The inital state of the group of radiobuttons (i.e. with the same `name` attribute) can be set in the viewmodel.

```html
<input type="radio" name="radio" value="first" {{bind 'radio: value'}}>
<input type="radio" name="radio" value="second" {{bind 'radio: value'}}>
```

```javascript
{ value: "first" }
```

#### Datepicker ([position])

The datepicker binding (named `pikaday`) is implemented with [Pikaday](https://github.com/richsilv/Pikaday/), so a package like `richsilv:pikaday` **must** be added for the binding it to work.

The property reflects the currently selected `Date`. An initial date can be set in the viewmodel. The `position` argument, optionally passed as a keyword argument, is where to render the datepicker (default: `bottom left`).

```html
<input type="text" placeholder="dd-mm-yyyy" {{bind 'pikaday: date'}}>
```

```javascript
{ date: new Date }  // Or simply null
```

#### Click

A method on the viewmodel is called when the element is clicked.

```html
<button {{bind 'click: click'}}></button>
```

```javascript
{ click: function (event, args, kwhash) { ... } }
```

#### Toggle

The property is negated on each `click` of the button.

```html
<button {{bind 'toggle: toggled'}}></button>
```

```javascript
{ toggled: false }
```

#### Submit ([send])

A method on the viewmodel is run when the form is submitted. If `true` is passed as the `send` argument in the binding, the event does **not** get `event.preventDefault()`, meaning that the form will be sent.

```html
<form {{bind 'submit: submit true'}}></form>
```

```javascript
{ submit: function (event, args, kwhash) { ... } }
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

The property reflects whether the element is in focus. An element can be given focus by setting the initial state to `true`.

```html
<input type="text" {{bind 'focused: focused'}}>
```

```javascript
{ focused: true }
```

#### Hovered

The property reflects whether the mouse hovers over the element.

```html
<button {{bind 'hovered: hovered'}}></button>
```

```javascript
{ hovered: false }
```

#### Enter key

A method on the viewmodel is run when the enter key is pressed on the element.

```html
<input type="text" {{bind 'enterKey: pressed'}}>
```

```javascript
{ pressed: function (event, args, kwhash) { ... } }
```

#### Key (keyCode)

A method on the viewmodel is run when the specific key, passed as an argument, is pressed on the element. In the example, it's the shift key.

```html
<input type="text" {{bind 'key: pressed 16'}}>
```

```javascript
{ pressed: function (event, args, kwhash) { ... } }
```

#### Classes

This bind expression may take any number of keys, including zero (the colon is omitted), that refer to boolean properties. The keys determine, which class names are toggled on the element.

```html
<p {{bind 'classes: red large'}}></p>
```

```javascript
{
  red: true,
  large: false
}
```

An object may also be as the keyword argument `classes` with class names as keys and toggle state as a boolean value.

```html
<p {{bind 'classes' classes=classes}}></p>
```

Class names passed as an object take precedence over those inside the bind expression.

#### Files

The property is an array of the currently selected file object(s) from the file picker. The boolean attribute `multiple` is optional on the input element.

```html
<input type="file" multiple {{bind 'files: files'}}>
```

```javascript
{ files: [] }
```


## Migration

If you are migrating gradually from `manuel:viewmodel` or any other package that exports a `ViewModel` and/or overwrites `Blaze.Template.prototype.viewmodel`, there are a couple of steps you need to take to remedy conflicts:

1. Make sure `dalgard:viewmodel` is included *before* any package that fits the description above.
2. Reassign the needed functionality to whichever names you like, directly from the package.

Like this:

```javascript
// E.g. /client/lib/dalgard-viewmodel.js

DalgardViewModel = Package["dalgard:viewmodel"].ViewModel;
Template.prototype.dalgardViewmodel = DalgardViewModel.viewmodelHook;

// Name of viewmodel reference on template instances
DalgardViewModel.referenceName = "dalgardViewmodel";
```

You can now use the two packages side by side, even on the same template, until everything is migrated.

Pro tip: Choose unique names that can be search-and-replace'd globally, when the time comes.


## History

- 0.7.0  –  API change: Removed lifetime hooks and Blaze events from viewmodel definition. Added `reset` method and various optimizations. Added `extends` and `dispose` to binding definition. Added `pikaday` binding. Fixed ongoing bug: Values are now properly restored with bindings nested in block helpers
- 0.6.2  –  Serious bug fix: Events are no longer registered more than once. Bug fix: Corrected signature when calling viewmodel methods (should only get `event`, `args`, and `kwhash`). API change: Removed `key` as a parameter for binding factories and `bind` method. `onReady` and `ViewModel.uniqueId` now part of public API.
- 0.6.1  –  Bug fix: Bind helpers were sometimes being rerun. `hashId` now part of public API.
- 0.6.0  –  Added `init` function to binding definition. `ViewModel.bindHelper` now part of public API.
- 0.5.9  –  Migration made possible by storing the `viewmodel` hook as a property on `ViewModel`. Multiple comma separated bind expressions in one string (for future Jade extension).
- 0.5.8  –  API change: Passing viewmodel property to `get` function instead of key.
- 0.5.7  –  API change: `args` argument now holds the key as the first value.
- 0.5.0  –  Optionally share state between two instances of the same viewmodel. Only use Object.defineProperties when present (to support <IE9).
- 0.4.0  –  Optionally transclude viewmodel.
- 0.3.0  –  Optionally persist viewmodel across routes.
- 0.2.0  –  Persist viewmodels on hot code pushes.

### Todo

- Rebind when kwargs change
- Possible to flush binds less often?
