dalgard:viewmodel 0.1.0
=======================

Minimalist VM for Meteor – inspired by `manuel:viewmodel` and `nikhizzle:session-bind`


#### Advantages

- Highly declarative
- Absolutely no redundant syntax
- Reactive
- Simple API
- Easily extensible


#### Install

~`meteor install dalgard:viewmodel`~


#### Use

```javascript
Template.thing.viewmodel({
  ...
});
```

Also check out the examples.


#### Todo

- Persist viewmodels on hot code pushes
- Optionally persist viewmodel across routes
- Optionally register bindings as individual helpers
