dalgard:viewmodel 1.0.1
=======================
<br>

> **Version `1.0.0` has been released** after an extended period without issues.
> 
> The new version should be compatible with the previous version `0.9.4`, except that jQuery has been removed as a dependency, meaning that elements and events are no longer wrapped in jQuery.
> 
> See the [History](#history) section for more info.

<br>
Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`.

- Simple, reactive API
- Easily extensible
- Non-intrusive
- Highly declarative
- Terse syntax

(6.0 kB minified and gzipped)

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
      - [Bind expressions](#bind-expressions)
  - [Viewmodel instances](#viewmodel-instances)
      - [Templates](#templates)
      - [Properties](#properties)
      - [Serialization](#serialization)
      - [Traversal](#traversal)
  - [Static methods](#static-methods)
  - [Transclude](#transclude)
  - [Persistence](#persistence)
  - [Shared state](#shared-state)
- [addBinding](#addbinding)
- [Built-in bindings](#built-in-bindings)
    - [Value ([throttle][, leading])](#value-throttle-leading)
    - [Checked](#checked)
    - [Radio](#radio)
    - [Pikaday ([position])](#pikaday-position)
    - [Click](#click)
    - [Toggle](#toggle)
    - [Submit ([send])](#submit-send)
    - [Disabled](#disabled)
    - [Focused](#focused)
    - [Hovered ([delay[Enter]][, delayLeave])](#hovered-delayenter-delayleave)
    - [Enter key](#enter-key)
    - [Key (keyCode)](#key-keycode)
    - [Class](#class)
    - [Files](#files)
- [Migration](#migration)
- [History](#history)

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

```js
// All the code you need to get started
ViewModel.registerHelper("bind");
```

```html
<template name="example">
  <input type="text" {{bind 'value: text'}}>
  <input type="checkbox" {{bind 'checked: show'}}>

  {{#if show}}
    <p style="{{#if red}}color: red;{{/if}}">{{text}}</p>
    <button {{bind 'toggle: red'}}>Toggle red</button>
  {{/if}}
</template>
```

**Note:** This example depends on the package `dalgard:get-helper-reactively` for using the `red` helper *before* it is actually declared.

Check out this example and others in the `/examples` directory and at [dalgard-viewmodel.meteor.com](http://dalgard-viewmodel.meteor.com/).


## Usage

The example below demonstrates the core features of the package.

Viewmodel declarations may sometimes be omitted altogether – the `{{bind}}` helper automatically creates what it needs, if registered globally (like in the quickstart example).

```html
<template name="page">
  <p>{{myFieldValue}}</p>
  
  {{> field startValue='Hello world'}}
</template>

<template name="field">
  <input type="text" {{bind 'value: myValue'}}>
</template>
```

```js
// Declare a viewmodel on this template (all properties are registered as Blaze helpers)
Template.page.viewmodel({
  // Computed property from child viewmodel
  myFieldValue() {
    // Get child viewmodel reactively by name
    const field = this.child("field");

    // Get the value of myValue reactively when the field is rendered
    return field && field.myValue();
  }
}, {});  // An options object may be passed

// Instead of a definition object, a factory function may be used.
// Unrelated to the factory, this viewmodel is given a name.
Template.field.viewmodel("field", function (data) {
  // Return the new viewmodel definition
  return {
    // Primitive property
    myValue: data && data.startValue || "",

    // Computed property
    regex() {
      // Get the value of myValue reactively
      const value = this.myValue();

      return new RegExp(value);
    },

    // React to changes in dependencies such as viewmodel properties
    // – can be an array of functions
    autorun() {
      // Log every time the computed regex property changes
      console.log("New value of regex:", this.regex());
    }
  };
});
```

When a viewmodel is created on a template – either implicitly or explicitly – existing Blaze helpers on the template become properties of the viewmodel. The helpers preserve their normal context and arguments when called.

The viewmodel of a template instance may be accessed inside lifetime hooks, helpers, and events, through the `viewmodel` property on the template instance:

```js
Template.example.viewmodel({
  myValue: "Hello world"
});

Template.example.onRendered(function () {
  console.log(this.viewmodel.myValue());  // "Hello world"
});

Template.example.events({
  "click button"(event, template_instance) {
    console.log(template_instance.viewmodel.myValue());  // "Hello world"
  }
});

// Additional helpers shouldn't be needed in practice, since all viewmodel
// properties are also registered as Blaze helpers
Template.example.helpers({
  myHelper() {
    return Template.instance().viewmodel.myValue();  // "Hello world"
  }
});

// If no name is specified for a viewmodel, it is named after its view
Template.other.helpers({
  otherHelper() {
    return ViewModel.findOne("Template.example").myValue();  // "Hello world"
  }
});
```

### Jade

To bind an element in a Jade template, when using the `mquandalle:jade` package, the slightly convoluted embedded Blaze syntax is used:

```jade
input(type='text' $dyn='{{bind "value: value" throttle=500}}')
```

A more elegant syntax can be achieved by using the [`dalgard:jade`](https://github.com/dalgard/meteor-jade) package instead of `mquandalle:jade`. This package is a direct fork of the latter one, which adds a few extensions to the syntax, allowing this syntax for binding elements:

```jade
input(type='text' $bind('value: value' throttle=500))
```

Check out the Jade example in `/examples/jade`.

## API

This is an extract of the full API – take five minutes to explore the ViewModel class with `dir(ViewModel)` and viewmodel instances with `ViewModel.find()` in your dev tools of choice.

### {{bind}}

To begin with, the Blaze bind helper only gets registered on templates with a declared viewmodel. The name of the helper may be changed like this:

```js
ViewModel.helperName = "myBind";
```

However, you may choose to register the helper globally:

```js
ViewModel.registerHelper(name);  // name is optional
```

The advantage of registering `{{bind}}` globally is that you may use it in any template without first declaring a viewmodel on it.

The helper then automatically creates a new viewmodel instance (if none existed) and registers any bound properties as Blaze helpers.

**Note:** The newly created helper may be used anywhere after the bind expression in the template. Using it *before* the call to `{{bind}}` is enabled by adding the package [`dalgard:get-helper-reactively`](https://github.com/dalgard/meteor-get-helper-reactively).

##### Bind expressions

The basic syntax of the bind helper looks like this:

```html
{{bind expression ...}}
```

... where `expression` is a string, formatted as a key/value pair:

```js
'binding: key'
```

You may pass multiple bind expressions to the helper – either as one string, separated by commas, or as multiple positional arguments.

There are cases, like with the `class` binding, where the key may be omitted or where multiple keys may be given.

Any space separated values after the colon inside the bind expression are passed as arguments to the binding – for instance, key and delay:

```html
<input type="text" {{bind 'value: search 1500'}}>
```

### Viewmodel instances

ViewModel can be used more or less programmatically, but below are the methods that are recommended for use inside computed properties, autoruns etc. when sticking to the more declarative approach.

(Optional arguments are written in brackets below)

```js
// Reactively get or set the name of the viewmodel
this.name([new_name]);
```

```js
// Reactively get or set an option on the viewmodel
this.option(name[, new_value]);
```

##### Templates

```js
// Get the current template instance
this.templateInstance();
```

```js
// Reactively get the data context of the current template instance
this.getData();
```

##### Properties

Primitive viewmodel properties are converted to reactive accessor methods. Call a property name with a new value to reactively *set* the value, and without arguments to reactively *get* the value.

```js
// Reactively get or set the property value
this.myProp([new_value]);
```

```js
// Get or set the property value non-reactively
this.myProp.nonreactive([new_value]);
```

```js
// Reset the property to its initial value
this.myProp.reset();
```

If the viewmodel shares its state (`share` flag is set), setting a new value – reactively or non-reactively – automatically sets the new value on all other instances of the same viewmodel (as a rule, you should never set a new value non-reactively).

All viewmodel methods have an internal value that can be accessed reactively through a pair of `set` and `get` methods on the methods themselves:

```js
Template.example.viewmodel({
  counter(addend) {
    if (_.isNumber(addend))
      // this.counter is a reference to the same method that we are in
      this.counter.set(addend + (this.counter.nonreactive() || 0));
    else
      return this.counter.get() || 0;
  }
});
```

##### Serialization

```js
// Get a snapshot of the viewmodel, ready for serialization
this.serialize();
```

```js
// Apply a snapshot to the viewmodel
this.deserialize(object);
```

```js
// Reset all properties to their initial values
this.reset();
```

##### Traversal

The recommended pattern with this package is to retrieve values from child viewmodels, rather than having the child viewmodels write values to their parent, as well as to use Spacebars keyword arguments to pass values down to children.

Consequently, the `parent`, `ancestor`, and `ancestors` methods should generally be avoided.

Each method takes a number of `test`s as optional arguments. A test can be either a **predicate function**, a **DOM element**, a **viewmodel**, a **regex**, or a **string**. The latter two are compared with the name of the viewmodel.

If no name is specified for a viewmodel, it is named after its view (e.g. `"Template.example"`).

```js
// Reactively get a filtered array of child viewmodels
this.children([...tests]);
```

```js
// Reactively get the first child or the child at index in a filtered array of
// child viewmodels
this.child([...tests][, index=0]);
```

```js
// Reactively get a filtered array of descendant viewmodels, optionally within
// a depth
this.descendants([...tests][, depth]);
```

```js
// Reactively get the first descendant or the descendant at index in a filtered
// array of descendant viewmodels, optionally within a depth
this.descendant([...tests][, index=0][, depth]);
```

```js
// Reactively get the parent viewmodel filtered by tests
this.parent([...tests]);
```

```js
// Reactively get a filtered array of ancestor viewmodels, optionally within
// a depth
this.ancestors([...tests][, depth]);
```

```js
// Reactively get the first ancestor or the ancestor at index in a filtered
// array of ancestor viewmodels, optionally within a depth
this.ancestor([...tests][, index=0][, depth]);
```

### Static methods

The methods below are mainly for inspection while developing, but may also be used as a convenient way of retrieving a far off component in a complex view hierarchy (see previous section).

```js
// Reactively get a filtered array of all the current viewmodels on the page
ViewModel.find([...tests]);
```

```js
// Reactively get the first item or the item at index in a filtered array of
// all the current viewmodels on the page
ViewModel.findOne([...tests][, index=0]);
```

The bound element-binding pairs – referred to as *nexuses*, with a novel term – that currently resides in a view, may be inspected through the view's `nexuses` property (the name of this property can be changed through `ViewModel.nexusesKey`).

To get a list of all the current nexuses on the page, use the static `find` and `findOne` methods on the `ViewModel.Nexus` class, which are equivalent to the methods on `ViewModel`. They are useful for finding and updating a property associated with a specific binding on an element (among other things):

```js
// Update viewmodel property
ViewModel.Nexus.findOne(dom_element, "value").prop("Hello new world");
```

Lastly, a utility method for finding the closest template instance from a view or DOM element (traversing upwards in the view hierarchy) is available as a static method on `ViewModel`:

```js
// Get the closest template instance
ViewModel.templateInstance(view || dom_elem);
```

### Transclude

To take a viewmodel out of the viewmodel hierarchy, set the `transclude` option to `true`:

```js
Template.example.viewmodel({
  prop: ""
}, { transclude: true });
```

A viewmodel that is transcluded becomes "invisible" to its parent and children. Instead, the children of the transcluded viewmodel become children of the transcluded viewmodel's parent.

This is useful when placing some component in a template, which has its own internal state, but which isn't otherwise relevant to the rest of the view hierarchy.

### Persistence

Values in viewmodel instances are automatically persisted across hot code pushes.

To persist the state of a viewmodel across re-renderings, including changing to another route and going back to a previous one, set the `persist` option to `true`:

```js
Template.example.viewmodel({
  // This property will be restored on re-render
  prop: ""
}, { persist: true });
```

In order to determine whether an instance is the same as a previous one, ViewModel looks at 1) the position of the viewmodel in the view hierarchy, 2) the index of the viewmodel in relation to sibling viewmodels, and 3) the browser location.

If all these things match, the state of the viewmodel instance will be restored.

**Important:** Any viewmodel that is a descendant of a viewmodel that has the `persist` flag set, is persisted in the same way.

### Shared state

Multiple instances of the same viewmodel can share their state – set the `share` option to `true`:

```js
Template.example.viewmodel({
  prop: ""
}, { share: true });
```

If a component is repeated on a page, the `share` flag makes sure that the state of the two instances is kept in sync automatically. This is useful for something like a pagination widget that is duplicated at the top and bottom of a page.


## addBinding

This is the full declaration of the `click` binding:

```js
ViewModel.addBinding("click", {
  on: "click"
});
```

The job of a binding is to synchronize data between the DOM and the viewmodel. Bindings are added through definition objects:

```js
// All properties are optional
ViewModel.addBinding("name", {
  /* Definition */

  // Run once when the element is rendered, right before the first call to set.
  // Used to initalize things like jQuery plugins. When creating a binding that
  // only contains init and/or dispose, set the "detached" option to true
  init(elem, init_value) {
    // For example
    this.instance = $(elem).plugin(this.hash.options);
  },

  // Apply the original value and new values to the DOM
  set(elem, new_value) {
    // For example
    elem.value = new_value || "";
  },

  // Space separated list or array of event types
  on: "keyup input change",

  // Get the changed value from the DOM triggered by events
  get(event, elem, prop) {
    // For example
    return elem.value;
  },

  // Run once when the view that contains the element is destroyed.
  // Used to tear down things like jQuery plugins.
  dispose(prop) {
    // For example
    this.instance.destroy();
    prop.reset();
  }
}, {
  /* Options */

  // Inherit the properties of one or several other bindings (name or array of names)
  extends: "superName",

  // Omitted in most cases. If true, the binding doesn't use a viewmodel, and
  // consequently, viewmodels or properties will not be created automatically
  detached: false
});
```

The parameters used for `init`, `set`, `get`, and `dispose` are:

- `event`  –  the original event object.
- `elem`  –  the DOM element that the `{{bind}}` helper was called on.
- `init_value`/`new_value`  –  the new value that was passed to the property.
- `prop`  –  the property on the viewmodel, if available.

Each function is called with an object as context (`this`) that is private to each specific bound element-binding pair. This object can be used to store plugin instances or other variables for the lifetime of the element.

The context object comes with some useful properties:

- `viewmodel`  –  A reference to the viewmodel, if available.
- `key`  –  The property key, if available.
- `view`  –  The view that the element was bound in.
- `templateInstance`  –  The nearest template instance.
- `data`  –  the current data context of the template instance.
- `args`  –  an array (possibly empty) containing any space separated values after the colon in the bind expression, including the key.
- `hash`  –  the keyword arguments that the `{{bind}}` helper was called with.

The returned value from the `get` function is written directly to the bound property. However, if the function doesn't return anything (i.e. returns `undefined`), the bound property is not called at all. This is practical in case you only want to call the bound property in *some* cases.

An example:

```js
ViewModel.addBinding("enterKey", {
  on: "keyup",

  // This function doesn't return anything but calls the property explicitly instead
  get(event, elem, prop) {
    if (event.keyCode === 13)
      // Call prop with these three arguments as standard
      prop(event, this.args, this.hash);
  }
});
```

In the case where you want to call the bound property, but not do so with a new value, simply omit `get` altogether – like with the `click` binding further above. The bound property will then be called with the arguments `event`, `args`, and `hash`.

If your binding has both `get` and `set`, and you don't want to trigger `set` as a result of calling `prop()` inside `get`, call `this.preventSet()` before calling the property.

A definition object may also be returned from a factory function, which is called with the same context object as the definition functions:

```js
ViewModel.addBinding(name, function () {
  // Return definition object
  return {};
});
```


## Built-in bindings

Several bindings are included with the package, but you are highly encouraged to add  more specialized bindings to your project in order to improve the readability of your code.

Arguments in the built-in bindings can be passed either as part of the bind expression or as keyword arguments to the helper:

```html
{{bind 'value: value 100 true'}}
<!-- or -->
{{bind 'value: value' throttle=100 leading=true}}
```

(Boilerplate code is omitted below and possible arguments are shown in parentheses)

#### Value ([throttle][, leading])

The property reflects the value of a text input, textarea, or select. An initial value can be set in the viewmodel. The `throttle` argument is a number (in ms) by which the update is [delayed](https://lodash.com/docs#throttle) as long as the user is typing. If the `leading` argument is `true`, the value is updated once before the delay.

```html
<input type="text" {{bind 'value: text 100'}}>
```

```js
{ text: "" }
```

#### Checked

The property reflects the state of the checkbox. The inital state of the checkbox can be set in the viewmodel.

```html
<input type="checkbox" {{bind 'checked: checked'}}>
```

```js
{ checked: false }
```

#### Radio

The property reflects the value of the radio button. The inital state of the group of radiobuttons (i.e. with the same `name` attribute) can be set in the viewmodel.

```html
<input type="radio" name="radio" value="first" {{bind 'radio: value'}}>
<input type="radio" name="radio" value="second" {{bind 'radio: value'}}>
```

```js
{ value: "first" }
```

#### Pikaday ([position])

This datepicker binding is implemented with [Pikaday](https://github.com/richsilv/Pikaday/), so a package like `richsilv:pikaday` **must** be added for the binding it to work.

The property reflects the currently selected `Date`. An initial date can be set in the viewmodel. The `position` argument determines where to render the datepicker (default: `bottom left`).

```html
<input type="text" placeholder="dd-mm-yyyy" {{bind 'pikaday: date'}}>
```

```js
{ date: new Date }  // Or simply null
```

An additional keyword argument `monthFirst` can be set to `true` if the month should come first in the date format.

#### Click

A method on the viewmodel is called when the element is clicked.

```html
<button {{bind 'click: click'}}></button>
```

```js
{ click(event, args, hash) { ... } }
```

#### Toggle

The property is negated on each `click` of the button.

```html
<button {{bind 'toggle: toggled'}}></button>
```

```js
{ toggled: false }
```

#### Submit ([send])

A method on the viewmodel is run when the form is submitted. If `true` is passed as the `send` argument, the event does **not** get `event.preventDefault()`, meaning that the form will be sent.

```html
<form {{bind 'submit: submit true'}}></form>
```

```js
{ submit(event, args, hash) { ... } }
```

#### Disabled

The disabled state of the element reflects a boolean property on the viewmodel. The inital state can be set in the viewmodel.

```html
<input type="text" {{bind 'disabled: disabled'}}>
```

```js
{ disabled: false }
```

#### Focused

The property reflects whether the element is in focus. An element can be given focus by setting the initial state to `true`.

```html
<input type="text" {{bind 'focused: focused'}}>
```

```js
{ focused: true }
```

#### Hovered ([delay[Enter]][, delayLeave])

The property reflects whether the mouse hovers over the element.

If an integer is passed as the only argument in the expression (keyword argument `delay`), this determines a delay on changing the property on both entering and leaving the element. To give each event a different delay, either pass two integers or use the keyword arguments `delayEnter` and `delayLeave`.

Delaying the leave state is especially useful for not immediately closing a hover menu if the cursor is moved outside the element briefly.

```html
<button {{bind 'hovered: hovered 0 500'}}></button>
```

```js
{ hovered: false }
```

#### Enter key

A method on the viewmodel is run when the enter key is pressed on the element.

```html
<input type="text" {{bind 'enterKey: press'}}>
```

```js
{ press(event, args, hash) { ... } }
```

#### Key (keyCode)

A method on the viewmodel is run when the specific key, passed as an argument, is pressed on the element. In the example, it's the shift key.

```html
<input type="text" {{bind 'key: press 16'}}>
```

```js
{ press(event, args, hash) { ... } }
```

#### Class

This bind expression takes a number of keys, where each key refers to a keyword argument. The name of the keyword argument represents a class name and the truthyness of its value determines whether the class is toggled.

If no keys are indicated in the bind expression (the colon should be omitted, too), all keyword arguments are used.

```html
<p {{bind 'class: red large' red=isRed large=true otherArg=''}}></p>
```

```js
{ isRed: true }
```

#### Files

The property is an array of the currently selected file object(s) from the file picker. The boolean attribute `multiple` is optional on the input element.

```html
<input type="file" multiple {{bind 'files: files'}}>
```

```js
{ files: [] }
```


## Migration

If you are migrating gradually from `manuel:viewmodel` or any other package that exports a `ViewModel` and/or overwrites `Template.prototype.viewmodel`, there are a couple of steps you need to take to remedy conflicts:

1. Make sure `dalgard:viewmodel` is included *before* any package that fits the description above.
2. Reassign the needed functionality to whichever names you like, directly from the package.

Like this:

```js
// E.g. /client/lib/dalgard-viewmodel.js

DalgardViewModel = Package["dalgard:viewmodel"].ViewModel;
Template.prototype.dalgardViewmodel = DalgardViewModel.viewmodelHook;

// Name of viewmodel reference on template instances
DalgardViewModel.viewmodelKey = "dalgardViewmodel";
```

You can now use the two packages side by side, even on the same template, until everything is migrated.

Pro tip: Choose unique names that can be search-and-replaced globally, when the time comes.


## History

- 1.0.1  –  Fixed passing event types as an array in binding definition.
- 1.0.0  –  jQuery was removed as a dependency; consequently, elements and events are no longer wrapped in jQuery. ViewModel class API changes: `ViewModel.nexuses()` → `ViewModel.Nexus.find()`. The `find()` and `findOne()` methods on `ViewModel` and `ViewModel.Nexus`, together with all the traversal methods, now take a number of tests as arguments (besides the usual index and depth arguments, in some cases); a test can be either a predicate function, a DOM element, a viewmodel, a regex, or a string. Added `ViewModel.templateInstance(view || dom_element)` utility method. Viewmodel instance API changes: `vm.isPersisted()`, `vm.restore(hash_id)`, `vm.addChild(vm)`, and `vm.removeChild(vm)` methods now public. Nexus instance API changes: `nexus.getProp()` → `nexus.prop`, `nexus.elem` → `nexus.elem()`, `nexus.setPrevented` → `nexus.isSetPrevented()`, `nexus.inBody()` → `ViewModel.Nexus.isInBody(nexus.elem())`.
- 0.9.4  –  Added `key` to binding context and improved `hovered` built-in binding.
- 0.9.3  –  Bug fixes: Corner case with rebinding on dynamic attribute change; don't put viewmodel on built-in templates.
- 0.9.2  –  API change: `classes` binding is renamed to `class` and changed to take (optionally indicated) keyword arguments as class names and their values as the class' presence. Creating a viewmodel adds existing Blaze template helpers as properties.
- 0.9.1  –  API change: `uniqueId` renamed to `uid`, `bindings` renamed to `nexuses`. Global list of binding nexuses can be inspected through `ViewModel.nexuses([name])`. Fixed bug: Using a predicate with traversal methods was temporarily broken. Updated Jade example to `dalgard:jade@0.5.0`.
- 0.9.0  –  Major refactoring. API change: Signatures and context of the functions in bindings is changed, and `extends` and `detached` are moved to an options object. Viewmodel methods have access to an internal reactive variable. Bound element-binding pairs (termed "nexuses") in a view can be inspected through the view's `bindings` property. Pikaday supports keyboard arrows up/down.
- 0.8.3  –  Don't trigger `set` on normal updates in bindings, i.e. with a return value from `get`.
- 0.8.2  –  If no name is specified for a viewmodel, it is named after its view
- 0.8.1  –  Bug fix: Using implicit helper before `{{bind}}` didn't work when the same template was used multiple times. API change: Changed `referenceName` to `referenceKey`.
- 0.8.0  –  Experimental feature: Helpers in templates without an explicitly declared viewmodel may now be used anywhere in the template, including before the actual call to `{{bind}}` that creates the helper. Added static serialization methods. Improved arguments for built-in bindings.
- 0.7.1  –  Added `nonreactive` get-set method to primitive viewmodel props. Possible to programmatically bind an element outside of the viewmodel's template. `children` method now always returns a copy.
- 0.7.0  –  API change: Removed lifetime hooks and Blaze events from viewmodel definition. Added `reset` method and various optimizations. Added `extends` and `dispose` to binding definition. Added `pikaday` binding. Fixed ongoing bug: Values are now properly restored with bindings nested in block helpers
- 0.6.2  –  Serious bug fix: Events are no longer registered more than once. Bug fix: Corrected signature when calling viewmodel methods (should only get `event`, `args`, and `hash`). API change: Removed `key` as a parameter for binding factories and `bind` method. `onReady` and `ViewModel.uniqueId` now part of public API.
- 0.6.1  –  Bug fix: Bind helpers were sometimes being rerun. `hashId` now part of public API.
- 0.6.0  –  Added `init` function to binding definition. `ViewModel.bindHelper` now part of public API.
- 0.5.9  –  Migration made possible by storing the `viewmodel` hook as a property on `ViewModel`. Multiple comma separated bind expressions in one string (for future Jade extension).
- 0.5.8  –  API change: Passing viewmodel property to `get` function instead of key.
- 0.5.7  –  API change: `args` argument now holds the key as the first value.
- 0.5.0  –  Optionally share state between two instances of the same viewmodel. Only use Object.defineProperties when present (to support <IE9).
- 0.4.0  –  Optionally transclude viewmodel.
- 0.3.0  –  Optionally persist viewmodel across routes.
- 0.2.0  –  Persist viewmodels on hot code pushes.

