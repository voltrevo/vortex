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
| Strict Semantics | Interpreting an unusual constructs as an error is prefererred over guessing intent. `1 == '1'` is neither true nor false - it's an error. |
| Fast Feedback | The compiler should analyze local correctness to deliver instant feedback during editing, even for very large projects. |
| Pure Functions | You will never get a different result when calling the same function with the same arguments (except for resource constraints and implementation bugs). |
| Local Mutation | Although tail recursion (implemented in `vxc` analyzer, coming soon to the VM) means you *can* write efficient recursive code, you don't have to. Functions are still pure, so you can safely mix and match these styles. |
| Immutable Data Structures | All values have *value semantics*, not just primitives. `['a', 'b'] == ['a', 'b']`. |
| Plain Old Data | Every functionless value has a straightforward json-like representation which identifies its data uniquely and completely. Just call `:String()`. Json and binary formats are planned too. |
| Abstraction | Vortex feels quite different to C/C++ because its semantics are based on a clean inner-universe of computation which is incompatible with things like memory layout, direct hardware access, and reference semantics. This allows many more opportunities for optimization because it is easier to transform programs without introducing subtle differences. |

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

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

For more examples see [./docs/examples.md](./docs/examples.md).

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

The VM is a stack machine. You can try a simpler implementation of the above program with:

```sh
echo '1 1 + return' | run
```

For a more readable format that's one step further away from the bytecode, use `--vasm` instead of `--code` when compiling.

The VM is much faster than the `vxc` analyzer, and allows Vortex programs to run outside of JavaScript. The plan is to use this for bootstrapping (compiling Vortex programs into the bytecode using Vortex itself), optimize the bytecode, and then compile down to targets like llvm and webassembly.

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

These steps should work on their own for basic syntax support. For the actual compiler feedback you'll need to set up the [ale plugin](https://github.com/w0rp/ale). Then you can connect the Vortex compiler with one more symlink:

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

**What is Vortex for?** Vortex is a general purpose programming language, so it could potentially be used for just about anything. I do have some more concrete purposes in mind, but I want to limit how much those purposes drive the design, because that could make Vortex less suitable for other purposes.

**How does Vortex talk to the outside world?**
It isn't yet well defined. I have a few methods in mind, and one of them is demonstrated with an interactive console application for playing blackjack:

```sh
vxc-console src/consoleApps/blackjack/main.vx
```

`vxc-console` provides a kind of scaffolding so that a Vortex program can define an interactive console application. In the Vortex code, this works by returning a function which takes the state and the user input as parameters, and then returns a new state and the text to display. `vxc-console` feeds the new state and the new user input back into the function when it gets more input. See [main.vx](src/consoleApps/blackjack/main.vx) for details.

I know this can seem strange. I'm still thinking about how to minimize the friction here. The reason you can't simply call functions which send and receive data from the outside world is that functions in Vortex are *pure*. In order for the compiler to optimize the code and provide rich development feedback, it needs to be able to run code speculatively and get real results.

These constraints can actually promote code quality. If it's easier for the compiler to understand, it may well be easier for collaborators to understand. It's very similar to what makes code *testable* in other languages.
