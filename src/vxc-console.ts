import * as fs from 'fs';
import * as readline from 'readline';

import * as minimist from 'minimist';

import { default as Analyzer, Outcome } from './Analyzer';
import Compiler from './Compiler';
import Note from './Note';
import pretty from './pretty';

const args = minimist(process.argv.slice(2));

if (args._.length !== 1) {
  throw new Error('Usage: lineIO <file>.vx');
}

const entryFile = '@/' + args._[0];

const fileCache: { [file: string]: string | Error } = {};

const readFile = (file: string) => {
  if (file === '(compiler)') {
    return new Error('invalid');
  }

  let text: string | Error | null = null;

  if (file.slice(0, 2) !== '@/') {
    throw new Error('Expected a local read: ' + file);
  }

  if (file in fileCache) {
    return fileCache[file];
  }

  try {
    text = fs.readFileSync(file.slice(2)).toString()
  } catch {}

  if (text === null) {
    text = new Error('not found');
  }

  fileCache[file] = text;

  return text;
};

let [notes, az] = Compiler.compile(
  [entryFile],
  readFile,
  { stepLimit: 1000000 }, // TODO: Make this configurable
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
  throw new Error('Shouldn\'t be possible (should bail earlier)');
}

if (entryMod.outcome === null) {
  throw new Error('Shouldn\'t be possible');
}

const entryValue = entryMod.outcome;

if (entryValue.t !== 'Func') {
  throw new Error(
    'Expected a function to be returned from ' + entryFile +
    ' but got ' + entryValue.t
  );
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function reducePrintReadLoop(
  reducer: Outcome.Func,
  state: Outcome,
  action: Outcome.Null | Outcome.String,
) {
  if (state.cat !== 'concrete') {
    if (state.t === 'exception') {
      if (!('level' in state.v)) {
        throw new Error('Shouldn\'t be possible');
      }

      pretty.print(state.v, readFile(state.v.pos[0]));
    }

    throw new Error('Reached unexpected state: ' + Outcome.LongString(state));
  }

  [state, az] = Analyzer.analyze.functionCallValue(
    az,
    null,
    reducer,
    [state, action],
  );

  if (state.t !== 'Object' || state.v.display === undefined) {
    throw new Error(
      'Expected state ' + Outcome.LongString(state) + ' to have a display key'
    );
  }

  const display = state.v.display;

  if (display.t !== 'String') {
    throw new Error(
      'Expected display to be a string but it was a(n) ' +
      display.t
    );
  }

  rl.question(display.v, (answer: string) => {
    action = Outcome.String(answer);
    reducePrintReadLoop(reducer, state, action);
  });
}

reducePrintReadLoop(entryValue, Outcome.Null(), Outcome.Null());
