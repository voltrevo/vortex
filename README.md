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
# (Or launch vs code with the current directory by some other method)
code .
```

The instance of vs code that launches initially is for developing the extension. Press F5 to start the special instance which has the extension installed.
