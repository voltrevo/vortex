# Contributing to Vortex

Thanks for considering contributing to Vortex! :tada:

I suggest starting small, like [this](/voltrevo/vortex/pull/1). However, if you already have something in mind, let's have a conversation first. Please file an [issue](/voltrevo/vortex/issues).

### Reporting Bugs
Bug reporting is a valuable contribution that doesn't require code changes. If you find something you believe is a bug, or especially if you see the phrase 'Internal error (please report this bug)' in the playground or from `vxc`, please file an [issue](/voltrevo/vortex/issues) with example input.

Optional: If you'd like your code demonstrating the bug to be included in the version history, so that GitHub lists you as a contributor, create a branch with a new file in [./src/testCode](./src/testCode) and mention it in the issue. I'll incorporate your commits when making the fix.

### Fixing TODOs
This codebase uses the word `TODO` for most issue tracking. Use `git grep -n TODO` to get started. They vary wildly in difficulty, many big ones are in [TODOs.txt](./TODOs.txt), look elsewhere for simpler ones.

### Adding/Improving Test Code
Vortex is primarily tested using [testCode](./src/testCode). In there you'll find code examples which explore lots of complex cases that the toolchain needs to handle correctly.

Lines which produce errors, warns, and infos are annotated with `#error`, `#warn`, and `#info` respectively. These annotations are checked against the actual output when running `npm test`. Every note has a series of tags describing the categories it falls into. Some tags are untested, and fixing that would be a great help.

### Playground Content
The files for the [playground](https://vortexlang.com/playground/) are specified [here](./vortexlang.com/src/playground/files). You could make contributions here by:
- Adding a demo for something you coded on the playground
- Improving the wording or fixing typos
- Adding a tutorial section on applications
- Reorganizing/rewriting some of the content (but start a conversation about it by filing an [issue](/voltrevo/vortex/issues) first)

### Standard Library Drafting
Vortex will need a standard library for common algorithms and data structures. The way these work will probably be shaped by future developments of the core language, but if you want to try them out now anyway I would be happy to add them to [./src/testCode/core](./src/testCode/core).

### Language Design Suggestions
I'm open to suggestions about how the language should work. There are many unsolved problems in this area, some of which are detailed in [unsolved.txt](/voltrevo/vortex/tree/master/unsolved.txt).

Please file an [issue](/voltrevo/vortex/issues), and include at least one example program and the proposed output. Something like this:

> I think that `%` should be used for percentage literals instead of modular arithmetic, and `mod` should be used for that instead. For example:
> ```js
> accountStart := 100.0;
> interestRate := 5%; // == 5.0 * 0.01
> years := 3.0;
>
> accountEnd := accountStart * (100% + interestRate) ** years;
>
> return accountEnd;
> ```
> Proposed output:
> ```js
> 115.76250000000002
> ```

(This is something I've actually thought about, but I'm guessing it won't happen.)

### Implementation Improvements and Features
It could be tricky at this stage. But if you're keen, let's talk.
