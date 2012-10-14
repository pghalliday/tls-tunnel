// Copyright 2012 The Obvious Corporation.

/*
 * Tests for the typ module
 */

/*
 * Modules used
 */

"use strict";

var assert = require("assert");
var events = require("events");
var util = require("util");

var typ = require("../");


/*
 * Module variables
 */

/**
 * List of all predicate and assertion functions. Each element maps
 * `assert` to the assertion and `predicate` to the predicate.
 */
var PREDICATES = [
  { assert: typ.assertArray, predicate: typ.isArray },
  { assert: typ.assertBoolean, predicate: typ.isBoolean },
  { assert: typ.assertBuffer, predicate: typ.isBuffer },
  { assert: typ.assertDate, predicate: typ.isDate },
  { assert: typ.assertDefined, predicate: typ.isDefined },
  { assert: typ.assertError, predicate: typ.isError },
  { assert: typ.assertFunction, predicate: typ.isFunction },
  { assert: typ.assertInt, predicate: typ.isInt },
  { assert: typ.assertMap, predicate: typ.isMap },
  { assert: typ.assertNull, predicate: typ.isNull },
  { assert: typ.assertNullish, predicate: typ.isNullish },
  { assert: typ.assertNumber, predicate: typ.isNumber },
  { assert: typ.assertObject, predicate: typ.isObject },
  { assert: typ.assertRegExp, predicate: typ.isRegExp },
  { assert: typ.assertString, predicate: typ.isString },
  { assert: typ.assertUInt, predicate: typ.isUInt },
  { assert: typ.assertUndefined, predicate: typ.isUndefined },
];

/**
 * List of value / predicate correspondences for use as test cases. On
 * each element `v` maps to an arbitrary value, and `p` maps to a list
 * of predicates which should be true for the value. All unlisted predicates
 * for a value are expected to be false for that value.
 */
var PREDICATE_CASES = [
  // arrays
  { v: [], p: [typ.isArray, typ.isObject, typ.isDefined] },
  { v: [1, 2, 3], p: [typ.isArray, typ.isObject, typ.isDefined] },
  // booleans
  { v: false, p: [typ.isBoolean, typ.isDefined] },
  { v: true, p: [typ.isBoolean, typ.isDefined] },
  // buffers
  { v: new Buffer(100), p: [typ.isBuffer, typ.isObject, typ.isDefined] },
  // dates
  { v: new Date(1234567), p: [typ.isDate, typ.isObject, typ.isDefined] },
  // errors
  { v: new Error("oy"), p: [typ.isError, typ.isObject, typ.isDefined] },
  // functions
  { v: function () { return 0; },
    p: [typ.isFunction, typ.isObject, typ.isDefined] },
  { v: new Function("return 5"),
    p: [typ.isFunction, typ.isObject, typ.isDefined] },
  // maps
  { v: {}, p: [typ.isMap, typ.isObject, typ.isDefined] },
  { v: { a: 10, b: 20 }, p: [typ.isMap, typ.isObject, typ.isDefined] },
  // non-map objects
  { v: new events.EventEmitter(), p: [typ.isObject, typ.isDefined] },
  { v: { get a() { return 5; } }, p: [typ.isObject, typ.isDefined] },
  { v: { set b(n) { } }, p: [typ.isObject, typ.isDefined] },
  // numbers
  { v: 0, p: [typ.isInt, typ.isUInt, typ.isNumber, typ.isDefined] },
  { v: 10, p: [typ.isInt, typ.isUInt, typ.isNumber, typ.isDefined] },
  { v: 1e200, p: [typ.isInt, typ.isUInt, typ.isNumber, typ.isDefined] },
  { v: -1, p: [typ.isInt, typ.isNumber, typ.isDefined] },
  { v: -12345, p: [typ.isInt, typ.isNumber, typ.isDefined] },
  { v: -12e55, p: [typ.isInt, typ.isNumber, typ.isDefined] },
  { v: 123.4, p: [typ.isNumber, typ.isDefined] },
  { v: Infinity, p: [typ.isNumber, typ.isDefined] },
  { v: -Infinity, p: [typ.isNumber, typ.isDefined] },
  { v: NaN, p: [typ.isNumber, typ.isDefined] }, // somewhat ironic
  { v: -1e-1000, p: [typ.isNumber, typ.isDefined] }, // !isInt()
  // regexps
  { v: /frobozz/, p: [typ.isRegExp, typ.isObject, typ.isDefined] },
  { v: new RegExp("fizmo"), p: [typ.isRegExp, typ.isObject, typ.isDefined] },
  // strings
  { v: "", p: [typ.isString, typ.isDefined] },
  { v: "blort", p: [typ.isString, typ.isDefined] },
  // notable edge cases
  { v: new Number(5), p: [typ.isObject, typ.isDefined] }, // !isNumber()
  { v: new String("fuzz"), p: [typ.isObject, typ.isDefined] }, // !isString()
  { v: new Boolean(true), p: [typ.isObject, typ.isDefined] }, // !isBoolean()
  // other
  { v: null, p: [typ.isNull, typ.isNullish, typ.isDefined] },
  { v: undefined, p: [typ.isNullish, typ.isUndefined] }
];


/*
 * Helper functions
 */

/**
 * Gets whether the given value is in the given array.
 */
function contains(array, value) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === value) {
      return true;
    }
  }

  return false;
}


/*
 * Tests
 */

/**
 * Test all the predicate cases. For each value, run each of the
 * predicates and assertions, checking to make sure they are all
 * as expected.
 */
function testAllPredicates() {
  for (var i = 0; i < PREDICATE_CASES.length; i++) {
    var one = PREDICATE_CASES[i];
    testOneValue(one.v, one.p);
  }

  function testOneValue(value, predicates) {
    for (var i = 0; i < PREDICATES.length; i++) {
      var one = PREDICATES[i];
      var assertFunc = one.assert;
      var predicate = one.predicate;
      var expectTrue = contains(predicates, predicate);

      var passedPredicate;
      try {
        passedPredicate = predicate(value);
      } catch (ex) {
        console.log("Unexpected exception", ex.stack);
        var msg = predicate.name + "(" + util.inspect(value) + ")";
        assert.fail("no exception", ex, msg);
      }

      if (predicate(value) !== expectTrue) {
        var msg = predicate.name + "(" + util.inspect(value) + ")";
        assert.fail(!expectTrue, expectTrue, msg);
      }

      var passedAssert;
      try {
        assertFunc(value);
        passedAssert = true;
      } catch (ex) {
        passedAssert = false;
      }

      if (passedAssert !== expectTrue) {
        var msg = assertFunc.name + "(" + util.inspect(value) + ")";
        assert.fail(!expectTrue, expectTrue, msg);
      }

      if (!passedAssert) {
        var message = "sample message " + i + " // " + value;
        try {
          assertFunc(value, message);
          var msg = assertFunc.name + "(" + util.inspect(value) + ", message)";
          assert.fail(true, false, msg);
        } catch (ex) {
          assert.equal(ex.message, message);
        }
      }
    }
  }
}

/**
 * Test `%` handling in failure messages.
 */
function testFailureFormat() {
  try {
    typ.assertString(123, "Well %% howdy %%% [%s]");
    assert.fail(true, false, "Failed to throw.");
  } catch (ex) {
    assert.equal(ex.message,
                 "Well % howdy %% [Expected string; got uint (123).]");
  }

  // We assume that all the substitution code is shared, and so we
  // don't bother testing all possible types.
}

/**
 * Test `hasDefaultPrototype()`.
 */
function testHasDefaultPrototype() {
  assert.ok(typ.hasDefaultPrototype({}));
  assert.ok(!typ.hasDefaultPrototype(Object.create({})));
  assert.ok(!typ.hasDefaultPrototype(new events.EventEmitter()));
}

/**
 * Test `hasOwnProperty()`.
 */
function testHasOwnProperty() {
  assert.ok(typ.hasOwnProperty({a: 10}, "a"));
  assert.ok(!typ.hasOwnProperty({}, "hasOwnProperty"));
  assert.ok(typ.hasOwnProperty({hasOwnProperty: "yay"}, "hasOwnProperty"));
}

testAllPredicates();
testFailureFormat();
testHasDefaultPrototype();
testHasOwnProperty();

console.log("All tests pass.");
