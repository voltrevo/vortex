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

function Tags(line: string): string[] {
  // (TODO: handle false positives caused by strings)
  // TODO: get parser to emit comments somehow
  const comment = line.match(/\/\/.*$/);

  if (!comment) {
    return [];
  }

  return comment[0].match(/\#\w*/g) || [];
}

let ok = true;

for (const file of files) {
  if (!/\.vlt$/.test(file)) {
    continue;
  }

  const fileText = readFileSync(file).toString();
  const notes = compile(fileText);

  const lines = fileText.split('\n');

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;

    const tags = Tags(line);
    const lineNotes = notes.filter(n => n.pos.first_line === lineNo);

    for (const level of ['error', 'warning', 'info']) {
      const levelTags = tags.filter(t => t === `#${level}`);
      const levelNotes = lineNotes.filter(n => n.level === level);

      const nt = levelTags.length;
      const nn = levelNotes.length;

      if (nt > nn) {
        ok = false;

        if (nn === 0) {
          console.error(
            `${file}:${lineNo} has ${level} tag that was not ` +
            `produced by the compiler\n`
          );
        } else {
          console.error(
            `${file}:${lineNo} has ${nt} ${level} tags but only ` +
            `${nn} were produced by the compiler`
          );
        }
      } else if (nn > nt) {
        ok = false;

        const wording = (
          nt === 0 ?
          `has untagged ${level}${nn > 1 ? 's' : ''}` :
          `has ${nn} ${level}s but only ${nt} tag${nt > 1 ? 's' : ''}`
        );

        console.error(
          `${file}:${lineNo} ${wording}:\n` +
          levelNotes.map(n => `  ${n.message}`).join('\n') + '\n'
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
