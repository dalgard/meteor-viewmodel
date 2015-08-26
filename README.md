dalgard:viewmodel 0.1.0
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`

- Highly declarative
- Absolutely no redundant syntax
- Reactive
- Simple API
- Easily extensible


#### Install

(coming soon)

~meteor install dalgard:viewmodel~


#### Usage

(work in progress)

```javascript
Template.thing.viewmodel({
  ...
});
```

Also check out the examples.


### API

(work in progress)

- {{bind}} helper (multiple, arguments) (global: helper must be used after bind)
- ViewModel.prototype
- static ViewModel


#### Todo

- Persist viewmodels on hot code pushes
- Optionally persist viewmodel across routes
- Optionally register bindings as individual helpers
