# Vortex
> A work-in-progress general purpose programming language.

### Work-In-Progress
Please keep in mind that Vortex is a work-in-progress. It will change in many backwards-incompatible ways before it is stable and suitable for production.

### Playground
You can try Vortex without any installs, straight from your browser at: https://vortexlang.com/playground/.

### Design Goals

| Name | Description |
|---|---|
| Familiarity | Vortex should feel familiar coming from JavaScript and other C family languages. |
| Strict Semantics | Interpreting an unusual constructs as errors is prefererred over guessing intent. `1 == '1'` is neither true nor false - it's an error. |
| Fast Feedback | The compiler should analyze local correctness to deliver instant feedback during editing, even for very large projects. |
| Pure Functions | You will never get a different result when calling the same function with the same arguments (except for resource constraints and implementation bugs). |
| Local Mutation | Although tail recursion (implemented in js, coming soon to the VM) means you *can* write efficient recursive code, you don't have to. Functions are still pure, so you can safely mix and match these styles. |
| Immutable Data Structures | All values have *value semantics*, not just primitives. `['a', 'b'] == ['a', 'b']`. |
| Plain Old Data | Every functionless value has a straightforward json-like representation which identifies its data uniquely and completely. Just call `:String()`. Json and binary formats are planned too. |
| Abstraction | Vortex feels quite different to C/C++ because its semantics are based on a clean inner-universe of computation which is incompatible with things like memory layout, direct hardware access, and reference semantics. This allows many more opportunities for optimization because it is easier to transform programs without introducing subtle differences. |

### Examples

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

// Error: might fail to return (for now, vortex's return analysis can't handle this case)
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
x := y; // Error: y does not exist
y := 3;

return x;
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

// By the way, tail call optimization is applicable here. This is implemented in js, but not yet
// in the VM.
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

TODO:
- Testing
- Classes

There are lots more examples in [testCode](src/testCode) and [projectEuler](src/projectEuler) ([about](https://projecteuler.net)), exploring all sorts of complex cases.

### Local Install

You will need [git](https://git-scm.com/) and [nodejs](https://nodejs.org/en/).

```sh
git clone https://github.com/voltrevo/vortex.git
cd vortex
npm install
npm run build
export PATH="$PATH:$(pwd)/bin"
```

This will add `vxc` to your path, and a few other things. You can use it like this:

```sh
echo 'return 2 ** 10;' | vxc -
```

Expected output:
```
@/(stdin): info: Outcome: 1024 #info #compiler #file-outcome

(compiler): info: Compiled 1 file(s), 3 steps, 6.349ms, 2116.225μs/step #info #statistics #compile-time
```

`vxc` also accepts files. If you create `readme-demo.vx` with this content:

```go
for (x of [5, 7]) {
  log.info x:String() ++ '^2 is ' ++ (x ** 2):String();
}

return 'done';
```

Then you can run it like this:
```sh
vxc readme-demo.vx
```

Expected output:
```
@/readme-demo.vx:2:12-53: info:
     func {
  1    for (x of [5, 7]) {
  2      log.info x:String() ++ '^2 = ' ++ (x ** 2):String();
                  ^ '5^2 = 25' (steps: 15)
                    #analyzer #info #custom
  3    }

@/readme-demo.vx:2:12-53: info:
     func {
  1    for (x of [5, 7]) {
  2      log.info x:String() ++ '^2 = ' ++ (x ** 2):String();
                  ^ '7^2 = 49' (steps: 27)
                    #analyzer #info #custom
  3    }

@/readme-demo.vx: info: Outcome: 'done' #info #compiler #file-outcome

(compiler): info: Compiled 1 file(s), 29 steps, 10.466ms, 360.882μs/step #info #statistics #compile-time
```

**Virtual Machine**

Consider the output of this command:

```sh
echo 'return 1 + 1;' | vxc - --code
```

After the usual output (which goes to stderr), you'll also get this output to stdout:

```
mfunc 0 {
  1
  1
  +
  return
}
mcall 0
return
```

This output is intended to be consumed by the virtual machine. It's an assembly of sorts which is very close to the bytecode for the vm. For now, the compiler generates this text output because it makes it easier to change the exact byte values used to represent the instructions.

To run the vm, you'll have to build the C++ project:

```sh
cd src/vm
git submodule update --init --recursive
make
export PATH="$PATH:$(pwd)/bin"
```

Then you can expand the previous command with:

```sh
echo 'return 1 + 1;' | vxc - --code | run
```

TODO: Expand this section.

### Editor Support

Vortex is intended to be written with real-time feedback from the compiler. There isn't yet a streamlined way to set this up, except in your browser at the [playground](https://vortexlang.com/playground/). Having said that, there are implementations for Vim and VS Code.

**Vim**

```sh
npm install
npm run build
```

Add these lines to your `.vimrc`:
```vimscript
au BufRead,BufNewFile *.vx set filetype=vortex
au BufRead,BufNewFile *.vasm set filetype=vasm
```

Add symlinks from `.vim` locations into the repo with something like:
```sh
ln -s ~/.vim/ftplugin/vortex.vim $(pwd)/src/vim/ftplugin/vortex.vim
ln -s ~/.vim/syntax/vortex.vim $(pwd)/src/vim/syntax/vortex.vim
ln -s ~/.vim/syntax/vasm.vim $(pwd)/src/vim/syntax/vasm.vim
```

These steps should work on their own for basic syntax support. For the actual compiler feedback you'll need to set up the [ale plugin](https://github.com/w0rp/ale). Then you can connect the vortex compiler with one more symlink:

```sh
ln -s ~/.vim/ale_linters/vortex $(pwd)/src/vim/ale_linters/vortex
```

**VS Code**

```sh
npm install
npm run build
cd vsCodeExtension
npm install
npm run compile

# code needs to be in your path: https://code.visualstudio.com/docs/editor/command-line
# (Or launch VS Code with the current directory by some other method)
code .
```

The instance of VS Code that launches initially is for developing the extension. Press F5 to start the special instance which has the extension installed.

### FAQ

**What is Vortex for?**
Vortex is a general purpose programming language, so it could potentially be used for just about anything. I do have some more concrete purposes in mind, but I want to limit how much those purposes drive the design, because that could make Vortex less suitable for other purposes.

**How does Vortex talk to the outside world?**
It isn't yet well defined. I have a few methods in mind, and one of them is demonstrated with an interactive console application for playing blackjack:

```sh
vxc-console src/consoleApps/blackjack/main.vx
```

`vxc-console` provides a kind of scaffolding so that a Vortex program can define an interactive console application. In the Vortex code, this works by returning a function which takes the state and the user input as parameters, and then returns a new state and the text to display. `vxc-console` feeds the new state and the new user input back into the function when it gets more input. See [main.vx](src/consoleApps/blackjack/main.vx) for details.

I know this can seem strange. I'm still thinking about how to minimize the friction here. The reason you can't simply call functions which send and receive data from the outside world is that functions in Vortex are *pure*. In order for the compiler to optimize the code and provide rich development feedback, it needs to be able to run code speculatively and get real results.

These constraints can actually promote code quality. If it's easier for the compiler to understand, it may well be easier for collaborators to understand. It's very similar to what makes code *testable* in other languages.
