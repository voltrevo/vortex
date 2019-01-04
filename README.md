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
| Strict Semantics | Interpreting an unusual program as invalid is prefererred over guessing intent. `1 == '1'` is neither true nor false - it's invalid. |
| Fast Feedback | The compiler should analyze local correctness to deliver instant feedback during editing, even for very large projects. |
| Pure Functions | You will never get a different result when calling the same function with the same arguments (except for resource constraints and implementation bugs). |
| Local Mutation | Although tail recursion (implemented in js, coming soon to the VM) means you *can* write efficient recursive code, you don't have to. Functions are still pure, so you can safely mix and match these styles. |
| Immutable Data Structures | All values have *value semantics*, not just primitives. `['a', 'b'] == ['a', 'b']`. |
| Plain Old Data | Every functionless value has a straightforward json-like representation which identifies its data uniquely and completely. Just call `:String()`. Json and binary formats are planned too. |
| Abstraction | Vortex feels quite different to C/C++ because its semantics are based on a clean inner-universe of computation which is incompatible with things like memory layout, direct hardware access, and reference semantics. This allows many more opportunities for optimization because it is easier to transform programs without introducing subtle differences. |

### Examples

Hello world:
```js
return 'Hello world!';
```

Failing to return is an error, so an empty program is invalid:
```js
// Error: failed to return
```

**Variables**
```js
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
```js
x := 0;
x := 0; // Error: x already exists
```
```js
x = 0; // Error: x does not exist
```
```js
x := 0;
x = x++; // Error: subexpression mutation
```

**Data structures**
```js
x := [1, 2, 3];
return 2 * x == [2, 4, 6]; // true
```
```js
return [
  [1, 2, 3] + [4, 5, 6], // [5, 7, 9]
  [1, 2, 3] ++ [4, 5, 6], // [1, 2, 3, 4, 5, 6]
];
```
```js
return {a: 1, b: 2} == {b: 2, a: 1}; // true // keys are unordered
```
```js
x := {};
x.foo := 'bar'; // Add properties with :=
x.foo = 'baz'; // Mutate properties with =
return x;
```
```js
x := [1, 2, 3];
y := x;

x ++= [4]; // This does not affect y

return [
  x == y, // false
  {x, y}, // {x: [1, 2, 3, 4], y: [1, 2, 3]}
];
```
```js
x := 1;
y := 2;

return {x} ++ {y}; // {x: 1, y: 2}
```
```js
return {x: 1} ++ {x: 2}; // Error: duplicate key (use + to get {x: 3})
```
```js
return [5, [6], [[7]], [[[8]]]] * 2; // [10, [12], [[14]], [[[16]]]]
```
```js
return 10 * {apples: 3, oranges: 2} + {oranges: 4, apples: 7}; // {apples: 37, oranges: 24}
```
```js
return [[1, 2], [3, 4]] * [[1, 2], [3, 4]]; // [[7, 10], [15, 22]]
```

Matrices can also be represented with objects. See [poker.vx](src/testCode/poker.vx) and [flatPoker.vx](src/testCode/flatPoker.vx).

Sets are also probably coming as an inbuilt data structure. Also objects will be able to contain non-string keys.

**If/Else**
```js
x := 0;

if (true) {
  x++;
}

return x; // 1
```
```js
if ('true') {} // Error: non-bool condition
```
```js
x := 0;
if (true) x++; // Syntax error (always use braces {})
return x;
```
```js
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
```js
x := 3;

return switch {
  (x == 2) => 'foo';
  (x == 3) => 'bar'; // 'bar'
  (x == 4) => 'baz';
};
```
```js
x := 10;

return switch {
  (x == 2) => 'foo';
  (x == 3) => 'bar';
  (x == 4) => 'baz';
}; // Error: reached end of switch
```
```js
x := 3;

return switch (x) {
  2 => 'foo';
  3 => 'bar'; // 'bar'
  4 => 'baz';
};
```

**Loops**
```js
i := 0;

for { // infinite loop
  i++;

  if (i == 100) {
    return i; // 100
  }
}

// The unbroken infinite loop removes the requirement to return here.
```
```js
for (true) { // also infinite loop
  return 'hi';
}

// Error: might fail to return (for now, vortex's return analysis can't handle this case)
```
```js
sum := 0;

for (i := 1; i <= 4; i++) {
  sum += i;
}

return sum; // 10
```
```js
sum := 0;

for (i of [1, 2, 3, 4]) {
  sum += i;
}

return sum; // 10
```
```js
for {
  break; // Warn: Break statement prevents return
}

// Error: Might fail to return
```
```js
for {
  continue; // Program loops forever, or step limit error
  return 'done'; // Should be unreachable error, currently not implemented
}
```
(Similar to [golang](https://golang.org/), `for` is the only loop construct.)

**Destructuring**
```js
[a, b] := [1, 2];
return a + b; // 3
```
```js
[[a, b], [[c]]] := [[1, 2], [[3]]];
return [a, b, c]; // [1, 2, 3]
```
```js
[a] := [1, 2]; // Error: destructuring mismatch
```
```js
[a, _, _] := [1, 2, 3]; // Unimplemented, currently syntax error
return a; // 1
```
```js
[a, ...] := [1, 2, 3]; // Also unimplemented, currently syntax error
return a; // 1
```
```js
[a, ...rest] := [1, 2, 3]; // Also unimplemented, currently syntax error
return [a, rest]; // [1, [2, 3]]
// (Equivalents for objects are also planned but unimplemented)
```
```js
a := 'foo';
b := 'bar';

[a, b] = [b, a];

return [a, b]; // ['bar', 'foo']
```
```js
{a, b: [c, d]} := {a: 1, b: [2, 3]};
return [a, c, d]; // [1, 2, 3] // (b does not exist)
```

**Functions**
```js
func add3(a, b, c) => a + b + c;
return add3(1, 2, 3); // 6
```
```js
func add3(a, b, c) {
  return a + b + c;
}; // Semicolon is currently required, but this might change.

return [
  add3(1, 2, 3), // 6
  add3([1, 2], [3, 4], [5, 6]), // [9, 12]
  // Explicit typing is probably coming to Vortex, but this should continue to work too
];
```
```js
func factorial(n) => switch {
  (n > 0) => n * factorial(n - 1);
  true => 1;
};

return factorial(5); // 120
```
```js
x := func() => 3;
y := func() => 7;
return x() + y(); // 10
```
```js
x := func(a) => func(b) => a + b;
return x(1)(2); // 3
```
```js
func call2(f, a, b) => f(a, b);
return call2(func(a, b) => a + b, 1, 2); // 3
```

**Scope**

In a nutshell, Vortex has strict block scoping, no shadowing, and only non-subexpression functions are hoisted. Closures work.

```js
x := y; // Error: y does not exist
y := 3;

return x;
```
```js
if (true) {
  x := 3; // Warn: x is unused
}

return x; // Error: x does not exist
```
```js
x := 0;

if (true) {
  x++; // Ok: x is in scope
}

return x; // 1
```
```js
for (i := 0; i < 3; i++) {}
return i; // Error: i does not exist
```
```js
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
```js
x := 3;
func foo() => x; // Ok: x is in scope, it gets captured
return foo(); // 3
```
```js
y := foo();
// Error: Although foo is hoisted, it captures x, so it is only hoisted up to where it is ok to
// call it.

x := 3;
// foo is hoisted up to here.

func foo() => x;
return y;
```
```js
func Counter() {
  i := 0;

  return counter() {
    i++; // Error: can't mutate captured variable
    return i;
  };
}

counter := Counter();

// Returning different values [1, 2] was prevented by disallowing mutation of a captured
// variable.
return [counter(), counter()];
```

TODO:
- Methods
- Modules
- Logging
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

```js
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
