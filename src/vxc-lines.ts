import * as path from 'path';

import * as minimist from 'minimist';

import Analyzer from './Analyzer';
import Compiler from './Compiler';
import FileReader from './FileReader';
import getStdin from './getStdin';
import Note from './Note';
import Outcome from './Analyzer/Outcome';
import PackageRoot from './PackageRoot';
import pretty from './pretty';

const args = minimist(process.argv.slice(2));

if (args._.length !== 1) {
  throw new Error('Usage: vxc-lines <file>.vx');
}

let resolvedFile = path.resolve(process.cwd(), args._[0]);

const packageRoot = PackageRoot(path.dirname(resolvedFile));

if (resolvedFile.slice(0, packageRoot.length + 1) !== packageRoot + path.sep) {
  throw new Error(
    `Should not be possible: ${resolvedFile} is outside package ${packageRoot}`
  );
}

const entryFile = resolvedFile.replace(packageRoot, '@');

const readFile = FileReader(packageRoot);

let [notes, az] = Compiler.compile(
  [entryFile],
  readFile,
  { stepLimit: 1000000 },
);

notes = Note.flatten(notes as Note[]);
let hasErrors = false;

for (const note of notes) {
  if (note.level !== 'error') {
    continue;
  }

  pretty.print(note, readFile(note.pos[0]));
  hasErrors = true;
}

if (hasErrors) {
  throw new Error('Aborting - failed to compile');
}

const entryMod = az.modules[entryFile];

if (!entryMod || !entryMod.loaded) {
  throw new Error('Should bail earlier');
}

if (entryMod.outcome === null) {
  throw new Error('Should bail earlier');
}

const entryFunc = entryMod.outcome;

if (entryFunc.t !== 'Func') {
  throw new Error(
    'Expected a Func to be returned from ' + entryFile +
    ' but got ' + entryFunc.t
  );
}

(async () => {
  const stdinText = await getStdin();

  const lines = Outcome.Array(stdinText.split('\n').map(Outcome.String));

  let output: Outcome;
  [output, az] = Analyzer.analyze.functionCallValue(
    {...az, steps: 0, stepLimit: null},
    null,
    entryFunc,
    [lines],
  );

  if (output.t === 'exception' && 'level' in output.v) {
    console.log();

    for (const note of Note.flatten([output.v])) {
      pretty.print(note, readFile(note.pos[0]));
    }
  } else {
    console.log(Outcome.LongString(output));
  }

  for (const file of Object.keys(az.modules)) {
    const mod = az.modules[file];

    if (!mod || !mod.loaded) {
      continue;
    }

    for (const note of Note.flatten(mod.notes)) {
      pretty.print(note, readFile(note.pos[0]));
    }
  }
})().catch(e => {
  setTimeout(() => { throw e; });
});
