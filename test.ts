import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

import compile from './compile';

const files = (spawnSync('git', ['ls-files'])
  .stdout
  .toString()
  .split('\n')
  .filter(line => line !== '')
  .sort((a, b) => (
    a.toUpperCase() < b.toUpperCase() ? -1 :
    a.toUpperCase() === b.toUpperCase() ? 0 :
    1
  ))
);

let ok = true;

for (const file of files) {
  if (!/\.vlt$/.test(file)) {
    continue;
  }

  const fileText = readFileSync(file).toString();
  const notes = compile(fileText);

  const lines = fileText.split('\n');

  for (const note of notes) {
    const line = lines[note.pos.first_line - 1];
    const commentMatches = line.match(/\/\/.*$/);

    if (
      !commentMatches ||
      commentMatches[0].split(' ').indexOf(note.level) === -1
    ) {
      ok = false;

      console.error(
        `${file}:${note.pos.first_line} contains unannotated ` +
        `${note.level}:\n  ${note.message}\n`
      );
    }
  }

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    const commentMatches = line.match(/\/\/.*$/);

    if (!commentMatches) {
      continue;
    }

    const annotations = (commentMatches[0]
      .split(' ')
      .filter(word => ['error', 'warning', 'info'].indexOf(word) !== -1)
    );

    for (const annotation of annotations) {
      if (!notes.some(note => (
        note.level === annotation &&
        note.pos.first_line === lineNo
      ))) {
        ok = false;

        console.error(
          `${file}:${lineNo} has ${annotation} annotation but this was not ` +
          `produced by the compiler\n`
        );
      }
    }
  }
}

if (ok) {
  console.log('Success');
} else {
  throw new Error('Errors found');
}

const todos = spawnSync('git', ['grep', 'TODO']).stdout.toString().split('\n');

if (todos.length > 0) {
  const isVlt = (todo: string) => /^[^:]*\.vlt:/.test(todo);
  console.log(`\n... found ${todos.length} TODOs though:\n`);
  console.log(todos.filter(isVlt).join('\n'));
  console.log(todos.filter(todo => !isVlt(todo)).join('\n'));
}
