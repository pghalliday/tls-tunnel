typ: Type predicates and assertions for Node
============================================

This Node module is meant to provide a unified place to ask and
assert about all the built-in JavaScript and core Node types.

"Typ" is German for "type". Also, as of this writing, both "type" and
"types" were taken in the npm module registry. The name was picked to
be both memorable and short, the latter in order to encourage it to be
used liberally.


Building and Installing
-----------------------

```shell
npm install typ
```

Or grab the source. As of this writing, this module has no
dependencies, so once you have the source, there's nothing more to do
to "build" it.


Testing
-------

```shell
npm test
```

Or

```shell
node ./test/test.js
```


API Details
-----------

Constants
---------

This module provides some convenient constants. With regards to the
string constants, the author finds it handy to use them instead of
quoted strings, since that makes typos cause more blatant errors.

### BOOLEAN

This is what's returned by `typeof` when given a boolean value.

### FUNCTION

This is what's returned by `typeof` when given a function value.

### NUMBER

This is what's returned by `typeof` when given a numeric value.

### OBJECT

This is what's returned by `typeof` when given an object value.

### STRING

This is what's returned by `typeof` when given a string value.

### UNDEFINED

This is what's returned by `typeof` when given `undefined`.

### ARRAY_PROTOTYPE

This is the object prototype of array instances.

### FUNCTION_PROTOTYPE

This is the object prototype of function instances.

### OBJECT_PROTOTYPE

This is the default object prototype.


Assertion Functions
-------------------

This module defines both predicates and assertions for a set of types
that covers the standard core JavaScript and Node types. For any given
type `name`, the predicate is called `isName()` and the assertion is
called `assertName()`. A predicate simply returns a boolean indicating
whether or not its value argument is of the appropriate type, and an
assertion does nothing other than throw a descriptive message if its
value argument is not of the expected type.

Predicates all take a single argument, `value`, the value to test.
Assertions all take two arguments, `value` as with the predicate, and
an optional `message` to replace the default message to report in an
error in the case of failure. The `message` if specified may contain
any number of instances of `%s`, which will be substituted with the
default message. `%%` is substituted with a single `%`. No other `%`
substitution is done.

The following run-down indicates the meaning of the various types, as
far as this module is concerned. If being a particular type implies
also being some other type(s), then that fact is indicated by an
"implies" line. (Note: Since all values but `undefined` are considered
`defined`, that fact isn't listed.)

### array: isArray(value), assertArray(value, message)

Implies: object

Arrays are what you get when you use the `[...]` array literal syntax
or the `new Array(...)` constructor.

### boolean: isBoolean(value), assertBoolean(value, message)

The only two booleans are `true` and `false`. Notably, `Boolean` objects
are not considered to be booleans here.

### buffer: isBuffer(value), assertBuffer(value, message)

Implies: object

Buffers are Node's standard ordered-list-of-bytes type, created
with the `new Buffer(...)` constructor and used all over the place
in Node.

### date: isDate(value), assertDate(value, message)

Implies: object

Dates represent moments in time. They can be created with the
`new Date(...)` constructor.

### defined: isDefined(value), assertDefined(value, message)

All values other than `undefined` are `defined`.

### error: isError(value), assertError(value, message)

Implies: object

Errors are the standard exception values in JavaScript. They can
be created by using the `new Error(...)` constructor as well
as sub-class constructors.

### function: isFunction(value), assertFunction(value, message)

Implies: object

Functions are the things in JavaScript that do work. They can
be created by using the `function...` definition and literal
syntax, as well as with the `new Function(...)` constructor.

### int: isInt(value), assertInt(value, message)

Implies: number

An int is an integer value, which is to say a number with no
fractional part. As far as this module is concerned, there is no
range limit on the ints (that is, an int doesn't have to fit in
32 bits, for example).

Notably, neither positive nor negative `Infinity` qualifies as an int.

In addition, as a strange edge case, "negative zero" is also *not*
considered to be an int. (You can produce a "negative zero" value
in JavaScript with the expression `-1e-1000`. You can differentiate
it from plain old regular zero by dividing `1` by it and observing
that the result is `-Infinity`.)

### map: isMap(value), assertMap(value, message)

Implies: object

A map is any object that behaves like a simple map-type collection.
In particular, a map's prototype must be the default object prototype,
and none of a map's bindings may be dynamic properties. That is,
getter and setter functions disqualify an object from being considered
a map.

### null: isNull(value), assertNull(value, message)

The only value that is null is `null` per se.

### nullish: isNullish(value), assertNullish(value, message)

The only two values that are considered to be "nullish" are `null`
and `undefined`.

### number: isNumber(value), assertNumber(value, message)

A number is, well, a numeric value. Numbers are what result from
using number literals (like `123`) and are returned, for example,
from the methods on the built-in `Math` object.

The values `Infinity` and `-Infinity` are considered to be numbers.
The special value `NaN` is alson considered to be a number, despite
the direct expansion of its name to "Not a Number".

Notably, `Number` objects are not considered numbers here.

### object: isObject(value), assertObject(value, message)

An object is an arbitrary mapping of string keys to values. They
can be created in any number of ways (and if you need more description
than that, you should find a good intro book on JavaScript).

Notably, `null` is *not* considered to be an object (even though
`typeof null == "object"`).

### regexp: isRegExp(value), assertRegExp(value, message)

Implies: object

A regexp is an object that represents a "regular expression". They
can be created by using the `/.../` literal syntax or the `new RegExp(...)`
constructor.

### string: isString(value), assertString(value, message)

A string is an ordered sequence of characters. They can be created
by using the `'...'` literal syntax and are produced by many standard
JavaScript functions.

Notably, `String` objects are not considered strings here.

### uint: isUInt(value), assertUInt(value, message)

Implies: int, number

A uint is an unsigned integer, also known as a whole number. That is,
it's anything that's an int which is also non-negative. `0` is notably
a uint.

### undefined: isUndefined(value), assertUndefined(value, message)

The only value that is undefined is `undefined`.

Notably, `null` is defined, *not* undefined.


Miscellaneous Functions
-----------------------

### hasDefaultPrototype(obj) -> boolean

Returns `true` if and only if the given object's prototype is the
default one. That is, this is just a convenient way to say:

```
Object.getPrototypeOf(obj) === OBJECT_PROTOTYPE
```

### hasOwnProperty(obj, name) -> boolean

This is a safe version of the per-object `hasOwnProperty()` method.
You should use this any time you can't be 100% sure that the object
you're checking won't possibly have a binding for `"hasOwnProperty"`.


To Do
-----

* Figure out something to do.


Contributing
------------

Questions, comments, bug reports, and pull requests are all welcome.
Submit them at [the project on GitHub](https://github.com/Obvious/typ/).

Bug reports that include steps-to-reproduce (including code) are the
best. Even better, make them in the form of pull requests that update
the test suite. Thanks!


Author
------

[Dan Bornstein](https://github.com/danfuzz)
([personal website](http://www.milk.com/)), supported by
[The Obvious Corporation](http://obvious.com/).

Thanks to [Jeremy Stanley](https://github.com/azulus),
[Dan Pupius](https://github.com/dpup),
[Mike Fleming](https://github.com/mikefleming),
and [Sho Kuwamoto](https://github.com/skuwamoto)
for suggestions.


License
-------

Copyright 2012 [The Obvious Corporation](http://obvious.com/).

Licensed under the Apache License, Version 2.0. 
See the top-level file `LICENSE.txt` and
(http://www.apache.org/licenses/LICENSE-2.0).
