import * as fs from 'fs';
import * as readline from 'readline';

import * as minimist from 'minimist';

import Compiler from './Compiler';
import Note from './Note';
import pretty from './pretty';
import runConsoleApp from './runConsoleApp';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const entryMod = az.modules[entryFile];

if (!entryMod || !entryMod.loaded) {
  throw new Error('Should bail earlier');
}

if (entryMod.outcome === null) {
  throw new Error('Should bail earlier');
}

const entryValue = entryMod.outcome;

if (entryValue.t !== 'Object') {
  throw new Error(
    'Expected an object to be returned from ' + entryFile +
    ' but got ' + entryValue.t
  );
}

let displayStr: string = '';

runConsoleApp(
  az,
  entryValue,
  (text: string) => { displayStr = text; },
  () => new Promise(resolve => {
    console.clear();
    rl.question(displayStr, resolve)
  }),
);
