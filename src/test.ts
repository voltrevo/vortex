import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

import colorize from './colorize';
import compile from './compile';
import Note from './Note';
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

const unseenTags: { [tag: string]: true | undefined } = {};

for (const tag of Note.tags) {
  unseenTags[tag] = true;
}

function Tags(line: string, file: string, lineNo: number): Note.Tag[] {
  // (TODO: handle false positives caused by strings)
  // TODO: get parser to emit comments somehow
  const comment = line.match(/\/\/.*$/);

  if (!comment) {
    return [];
  }

  const matches = comment[0].match(/\#[a-z-]*/g) || [];

  const tags: Note.Tag[] = [];

  for (const match of matches) {
    const t = match.slice(1);

    if (Note.isTag(t)) {
      tags.push(t);
      delete unseenTags[t];
    } else {
      log.error(
        `${file}:${lineNo}: error: unrecognized tag: ${t}\n`
      );

      ok = false;
    }
  }

  return tags;
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
  const notes = Note.flatten(compile(fileText));
  const after = process.hrtime();
  compileTime += SecondsDiff(before, after);
  compiledFiles++;

  const lines = fileText.split('\n');

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;

    const tags = Tags(line, file, lineNo);
    const lineNotes = notes.filter(n => n.pos && n.pos[0][0] === lineNo);

    for (const level of ['error', 'warning', 'info']) {
      const levelTags = tags.filter(t => t === level);
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
          const prettyLines = prettyErrorContext({ file, ...note }, fileText);

          for (const prettyLine of prettyLines) {
            console.error(prettyLine);
          }
        }
      }
    }

    for (const note of lineNotes) {
      const nonLevelTags = note.tags.filter(t => (
        ['error', 'warning', 'info'].indexOf(t) === -1
      ));

      let hasAMatch = false;

      for (const tag of nonLevelTags) {
        if (tags.indexOf(tag) !== -1) {
          hasAMatch = true;
        }
      }

      if (!hasAMatch) {
        log.error(
          `${file}:${lineNo}: line is insufficiently tagged. Need to add ` +
          `at least one of: ${nonLevelTags.map(t => `#${t}`).join(', ')}`
        );
      }
    }

    for (const tag of tags) {
      let hasAMatch = false;

      for (const note of lineNotes) {
        if (note.tags.indexOf(tag) !== -1) {
          hasAMatch = true;
          break;
        }
      }

      if (!hasAMatch) {
        log.error(
          `${file}:${lineNo}: #${tag} tag that was not produced by the ` +
          `compiler`
        );
      }
    }
  }
}

for (const unseenTag of Object.keys(unseenTags)) {
  log.error('>>> error: unseen tag: ' + unseenTag);
  ok = false;
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
    line.split(':')[0],
    Number(line.split(':')[1]),
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
