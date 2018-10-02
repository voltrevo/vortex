import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

import colorize from './colorize';
import compile from './compile';
import prettyErrorContext from './prettyErrorContext';
import SecondsDiff from './SecondsDiff';

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

const log = {
  error(str: string) {
    for (const line of str.split('\n')) {
      console.error(colorize(line));
    }
  },
  info(str: string) {
    for (const line of str.split('\n')) {
      console.info(colorize(line));
    }
  }
};

let ok = true;
let compileTime = 0;
let compiledFiles = 0;

for (const file of files) {
  if (!/\.vx$/.test(file)) {
    continue;
  }

  const fileText = readFileSync(file).toString();
  const before = process.hrtime();
  const notes = compile(fileText);
  const after = process.hrtime();
  compileTime += SecondsDiff(before, after);
  compiledFiles++;

  const lines = fileText.split('\n');

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;

    const tags = Tags(line);
    const lineNotes = notes.filter(n => n.pos && n.pos.first_line === lineNo);

    for (const level of ['error', 'warning', 'info']) {
      const levelTags = tags.filter(t => t === `#${level}`);
      const levelNotes = lineNotes.filter(n => n.level === level);

      const nt = levelTags.length;
      const nn = levelNotes.length;

      if (nt > nn) {
        ok = false;

        if (nn === 0) {
          log.error(
            `${file}:${lineNo}: ${level} tag that was not ` +
            `produced by the compiler\n`
          );
        } else {
          log.error(
            `${file}:${lineNo}: ${nt} ${level} tags but only ` +
            `${nn} ${nn > 1 ? 'were' : 'was'} produced by the compiler`
          );
        }
      } else if (nn > nt) {
        ok = false;

        const wording = (
          nt === 0 ?
          `untagged ${level}${nn > 1 ? 's' : ''}` :
          `${nn} ${level}s but only ${nt} tag${nt > 1 ? 's' : ''}`
        );

        log.error(`${file}:${lineNo}: ${wording}:`);

        for (const note of levelNotes) {
          for (const prettyLine of prettyErrorContext({
            file,
            text: fileText,
            ...note
          })) {
            console.error(prettyLine);
          }
        }
      }
    }
  }
}

log.info('>>> info: ' +
  `Compiled ${compiledFiles} files in ${(1000 * compileTime).toFixed(3)}ms`
);

if (ok) {
  log.info('>>> info: Tag matching succeeded');
} else {
  log.error('>>> error: Tag matching failed');
}

console.log('\n' + (new Array(80).fill('-').join('')) + '\n');

function compareArrays(a: any[], b: any[]) {
  for (let i = 0; true; i++) {
    const aOk = i < a.length;
    const bOk = i < b.length;

    if (aOk !== bOk) {
      return aOk ? -1 : 1;
    }

    if (!aOk) {
      return 0;
    }

    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
}

function TodoSortPriority(line: string) {
  return [
    /^TODOs:/.test(line) ? 0 : 1,
    /^[^:]*\.vx:/.test(line) ? 0 : 1,
    line,
  ];
}

const todos = (spawnSync('git', ['grep', '-n', 'TODO'])
  .stdout
  .toString()
  .split('\n')
  .filter(line => line !== '')
  .sort((a, b) => {
    return compareArrays(
      TodoSortPriority(a),
      TodoSortPriority(b),
    );
  })
);

if (todos.length > 0) {
  log.info(`Found ${todos.length} TODOs:\n`);
  log.info(todos.join('\n'));
}
