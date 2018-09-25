import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

import compile from './compile';

const files = (spawnSync('git', ['ls-files'])
  .stdout
  .toString()
  .split('\n')
  .filter(line => line !== '')
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
    const line = lines[note.pos.first_line];
    const commentMatches = line.match(/\/\/[errorwarninfo ]*$/);

    if (!commentMatches || !commentMatches[0].split(' ').indexOf(note.level)) {
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
    const commentMatches = line.match(/\/\/[errorwarninfo ]*$/);

    if (!commentMatches) {
      continue;
    }

    const annotations = (commentMatches[0]
      .split(' ')
      .filter(word => word !== '' && word !== '//')
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

if (!ok) {
  throw new Error('Errors found');
}
