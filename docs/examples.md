# Examples

Hello world:
```go
return 'Hello world!';
```

Failing to return is an error, so an empty program is invalid:
```go
// Error: failed to return
```

**Variables**
```go
// Create variables with :=
x := 0;

// Mutate variables with =
x = 1;

// Increment, decrement, and compound assignment operators are also available:
x++;
x--;
x *= 10;
x **= 2;

return x; // 100
```
```go
x := 0;
x := 0; // Error: x already exists
```
```go
x = 0; // Error: x does not exist
```
```go
x := 0;
x = x++; // Error: subexpression mutation
```

**Data structures**
```go
x := [1, 2, 3];
return 2 * x == [2, 4, 6]; // true
```
```go
return [
  [1, 2, 3] + [4, 5, 6], // [5, 7, 9]
  [1, 2, 3] ++ [4, 5, 6], // [1, 2, 3, 4, 5, 6]
];
```
```go
return {a: 1, b: 2} == {b: 2, a: 1}; // true // keys are unordered
```
```go
x := {};
x.foo := 'bar'; // Add properties with :=
x.foo = 'baz'; // Mutate properties with =
return x;
```
```go
x := [1, 2, 3];
y := x;

x ++= [4]; // This does not affect y

return [
  x == y, // false
  {x, y}, // {x: [1, 2, 3, 4], y: [1, 2, 3]}
];
```
```go
x := 1;
y := 2;

return {x} ++ {y}; // {x: 1, y: 2}
```
```go
return {x: 1} ++ {x: 2}; // Error: duplicate key (use + to get {x: 3})
```
```go
return [5, [6], [[7]], [[[8]]]] * 2; // [10, [12], [[14]], [[[16]]]]
```
```go
return 10 * {apples: 3, oranges: 2} + {oranges: 4, apples: 7}; // {apples: 37, oranges: 24}
```
```go
return [[1, 2], [3, 4]] * [[1, 2], [3, 4]]; // [[7, 10], [15, 22]]
```

Matrices can also be represented with objects. See [poker.vx](src/testCode/poker.vx) and [flatPoker.vx](src/testCode/flatPoker.vx).

Sets are also probably coming as an inbuilt data structure. Also objects will be able to contain non-string keys.

**If/Else**
```go
x := 0;

if (true) {
  x++;
}

return x; // 1
```
```go
if ('true') {} // Error: non-bool condition
```
```go
x := 0;
if (true) x++; // Syntax error (always use braces {})
return x;
```
```go
x := null;

if (false) {
  x = 'if';
} else if (false) {
  x = 'else if';
} else {
  x = 'else';
}

return x; // 'else'
```

**Switch**
```go
x := 3;

return switch {
  (x == 2) => 'foo';
  (x == 3) => 'bar'; // 'bar'
  (x == 4) => 'baz';
};
```
```go
x := 10;

return switch {
  (x == 2) => 'foo';
  (x == 3) => 'bar';
  (x == 4) => 'baz';
}; // Error: reached end of switch
```
```go
x := 3;

return switch (x) {
  2 => 'foo';
  3 => 'bar'; // 'bar'
  4 => 'baz';
};
```

**Loops**
```go
i := 0;

for { // infinite loop
  i++;

  if (i == 100) {
    return i; // 100
  }
}

// The unbroken infinite loop removes the requirement to return here.
```
```go
for (true) { // also infinite loop
  return 'hi';
}

// Error: might fail to return (for now, Vortex's return analysis can't handle this case)
```
```go
sum := 0;

for (i := 1; i <= 4; i++) {
  sum += i;
}

return sum; // 10
```
```go
sum := 0;

for (i of [1, 2, 3, 4]) {
  sum += i;
}

return sum; // 10
```
```go
for {
  break; // Warn: Break statement prevents return
}

// Error: Might fail to return
```
```go
for {
  continue; // Program loops forever, or step limit error
  return 'done'; // Should be unreachable error, currently not implemented
}
```
(Similar to [golang](https://golang.org/), `for` is the only loop construct.)

**Destructuring**
```go
[a, b] := [1, 2];
return a + b; // 3
```
```go
[[a, b], [[c]]] := [[1, 2], [[3]]];
return [a, b, c]; // [1, 2, 3]
```
```go
[a] := [1, 2]; // Error: destructuring mismatch
```
```go
[a, _, _] := [1, 2, 3]; // Unimplemented, currently syntax error
return a; // 1
```
```go
[a, ...] := [1, 2, 3]; // Also unimplemented, currently syntax error
return a; // 1
```
```go
[a, ...rest] := [1, 2, 3]; // Also unimplemented, currently syntax error
return [a, rest]; // [1, [2, 3]]
// (Equivalents for objects are also planned but unimplemented)
```
```go
a := 'foo';
b := 'bar';

[a, b] = [b, a];

return [a, b]; // ['bar', 'foo']
```
```go
{a, b: [c, d]} := {a: 1, b: [2, 3]};
return [a, c, d]; // [1, 2, 3] // (b does not exist)
```

**Functions**
```go
func add3(a, b, c) => a + b + c;
return add3(1, 2, 3); // 6
```
```go
func add3(a, b, c) {
  return a + b + c;
}; // Semicolon is currently required, but this might change.

return [
  add3(1, 2, 3), // 6
  add3([1, 2], [3, 4], [5, 6]), // [9, 12]
  // Explicit typing is probably coming to Vortex, but this should continue to work too
];
```
```go
func factorial(n) => switch {
  (n > 0) => n * factorial(n - 1);
  true => 1;
};

return factorial(5); // 120
```
```go
x := func() => 3;
y := func() => 7;
return x() + y(); // 10
```
```go
x := func(a) => func(b) => a + b;
return x(1)(2); // 3
```
```go
func call2(f, a, b) => f(a, b);
return call2(*, 3, 5); // 15
```

**Scope**

In a nutshell, Vortex has strict block scoping, no shadowing, and only non-subexpression functions are hoisted. Closures work.

```go
y := x; // Error: x does not exist
x := 3;

return y;
```
```go
if (true) {
  x := 3; // Warn: x is unused
}

return x; // Error: x does not exist
```
```go
x := 0;

if (true) {
  x++; // Ok: x is in scope
}

return x; // 1
```
```go
for (i := 0; i < 3; i++) {}
return i; // Error: i does not exist
```
```go
// Mutual recursion is a complex example, but it's also the motivating example for hoisting.
// Hoisting adds significant complexity to the language, and it wouldn't be implemented if it
// were not for this case.

func foo(x, depth) {
  if (x == 0) {
    return ['stopping at 0', {depth}];
  }

  return bar((x + 5) % 13, depth + 1); // Ok: bar is hoisted
};

func bar(x, depth) {
  if (x == 1) {
    return ['stopping at 1', {depth}];
  }

  return foo((x + 5) % 13, depth + 1);
};

return foo(7, 0); // ['stopping at 1', {depth: 17}]

// By the way, tail call optimization is applicable here. This is implemented in the vxc analyzer,
// but not yet in the VM.
```
```go
x := 3;
func foo() => x; // Ok: x is in scope, it gets captured
return foo(); // 3
```
```go
y := foo();
// Error: Although foo is hoisted, it captures x, so it is only hoisted up to where it is ok to
// call it.

x := 3;
// foo is hoisted up to here.

func foo() => x;
return y;
```
Vortex also limits hoisting based on [transitive captures](src/testCode/functions/noCompile/transitiveClosure.vx).
```go
func Counter() {
  i := 0;

  return func counter() {
    i++; // Error: can't mutate captured variable
    return i;
  };
}

counter := Counter();

// Returning different values [1, 2] was prevented by disallowing mutation of a captured
// variable.
return [counter(), counter()];
```
```go
x := 3;

func foo(x) { // Error: x already exists (shadowing is not allowed)
  return 2 * x;
};
```
```go
x := 3;

if (true) {
  x := 5; // Error: x already exists
}
```
```go
sum := 0;

if (true) {
  x := 1;
  sum += 2 * x;
}

if (true) {
  x := 2; // Ok: previous x is not in scope
  sum += 2 * x;
}

x := 3; // Also ok
sum += 2 * x;

return sum; // 12
```
```go
funcs := [];

for (x := 1; x <= 3; x++) { // Error: can't mutate x because it is captured
  funcs ++= [func() => x];
}
```
```go
funcs := [];

for (x of [1, 2, 3]) {
  funcs ++= [func() => x]; // Ok: it's a different x each time
}

[a, b, c] := funcs;

return [a(), b(), c()]; // [1, 2, 3]
```

**Methods**

Methods are functions based on values accessed by `:`, i.e. the method lookup operator. This removes the restrictions and complications of object keys caused by overloading the `.` operator in other languages. Methods are fixed and not assignable.

These are the currently available methods:

| null   | bool   | Number types | string | array     | object    | function |
|--------|--------|--------------|--------|-----------|-----------|----------|
| String | String | String       | String | String    | String    |          |
|        |        |              | Length | Length    |           |          |
|        |        |              |        | Keys      | Keys      |          |
|        |        |              |        | Values    | Values    |          |
|        |        |              |        | Entries   | Entries   |          |
|        |        |              |        | Row       | Row       |          |
|        |        |              |        | Column    | Column    |          |
|        |        |              |        | Transpose | Transpose |          |
|        |        |              |        | Front     |           |          |
|        |        |              |        | Back      |           |          |
|        |        |              |        | map       |           |          |
|        |        |              |        | reduce    |           |          |
|        |        |              |        |           |           | bind     |

Usually the function obtained from method lookup is called immediately, e.g.:

```go
return [1, 2, 3, 4]:reduce(+); // 10
```

But they are also regular functions, so you can also do things like this:

```go
reduceNums := [1, 2, 3, 4]:reduce;

return {
  sum: reduceNums(+), // 10
  product: reduceNums(*), // 24
};
```

**Modules**

Every module simply returns a value, which can be imported into another module:

```js
// values.vx
return [1, 1, 2, 3, 5, 8];
```
```js
import values;
return values:reduce(+); // 20
```

If you're only using the import in one place and don't want to add its name to the scope, `import` also works inside an expression:

```js
return (import values):reduce(+); // 20
```

`import` defaults to the current directory, use the `from` clause to import from elsewhere:

```js
import foo from './util'; // ./util/foo.vx
```

You can't use `..` to access parent directories in import paths, but you can use `@` to start your path from the project root:

```js
// @/foo/bar.vx
import sort from '@/util'; // @/util/sort.vx (aka ../util/sort.vx)
```

(Currently the project root is just the working directory where the CLI is launched.)

If you create a circular import in a way that would create an infinite loop, an error is emitted:

```js
// loop.vx
import loop;
return loop; // Error: Import loop detected: @/([loop.vx] -> [loop.vx])
```

However, import statements (ie not part of a larger expression) are deferred until their actual usage. This means a circular import is actually ok as long as it doesn't get called during execution of the module. For example:

```js
// circular.vx
import circular;

return {
  foo: func(x) => 2 * circular.bar(x),
  bar: func(x) => 2 * x,
};
```
```js
import circular;
return circular.foo(10); // 40
```

Imports can be mutually circular too. See [src/testCode/imports](src/testCode/imports) for more examples.

**Logging**

Vortex has special log statements beginning with `log.info`, `log.warn`, and `log.error`. These statements have no effect on the formal output of a Vortex program, but are generally surfaced to the developer in some way depending on the tooling being used. Currently `vxc` emits compiler notes about them, and the VM prints messages to stderr. Future optimizations may impact log messages (e.g. by calling `foo` only once in `foo() + foo()`) or offer to remove them altogether.

```js
log.info 1 + 1; // INFO: 2

x := 1000000;

if (x > 1000) {
  log.warn ['Computation may be excessive for large input', {x}];
  // WARN: ['Computation may be excessive for large input', {x: 1000000}]
}

log.error 123; // ERROR: 123

return 'done';
```

**Testing**

In Vortex, you should weave code and tests together using `assert` statements. For example:

```js
func sort(values) {
  // TODO: actually sort the values
  return values;
};

assert sort([3, 1, 2]) == [1, 2, 3];

return sort;
```

This allows using `assert` inside nested functions that might not be directly accessible. `assert` should be used liberally to promote code quality and flag unexpected data as early as possible.

If you'd still like to write tests in dedicated test files, you can do that too:

```js
import sort;

assert sort([3, 1, 2]) == [1, 2, 3];

return 'done';
```

When an assert fails, `vxc` provides details about the false expression:

```js
x := 3;
y := 10;

assert x > y; // Error: Asserted (3 > 10)

return 'done';
```

**Classes**

Classes are unimplemented, except for their syntax. The behavior I have in mind is tied up in the also unimplemented typing system - classes should simply be objects with a compile-time-only distinction. For example, this program:

```js
class Point { // Error: unimplemented
  f64 x;
  f64 y;

  :flip() { [x, y] = [y, x]; }
  :size() => (x * x + y * y) ** 0.5;
};

p := Point({x: 3.0, y: 4.0});

p = :flip();

return [p, p:size()];
```

Should be equivalent to something like:

```js
// All the behavior here is implemented.

func flip(point) {
  [point.x, point.y] = [point.y, point.x];
  return point;
};

func size(point) => (point.x * point.x + point.y * point.y) ** 0.5;

p := {x: 3.0, y: 4.0};

p = flip(p);

return [p, size(p)]; // [{x: 4.0, y: 3.0}, 5.0]
```

There are lots more examples in [testCode](src/testCode) and [projectEuler](src/projectEuler) ([about](https://projecteuler.net)), exploring all sorts of complex cases.
