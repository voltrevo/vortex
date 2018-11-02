import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

import Compiler from './Compiler';
import formatLocation from './formatLocation';
import Note from './Note';
import pretty from './pretty';

const files = (spawnSync('git', ['ls-files'])
  .stdout
  .toString()
  .split('\n')
  .filter(line => (
    line !== '' &&
    /\.vx$/.test(line) &&
    !/projectEuler/.test(line)
  ))
  .sort((a, b) => (
    a.toUpperCase() < b.toUpperCase() ? -1 :
    a.toUpperCase() === b.toUpperCase() ? 0 :
    1
  ))
  .map(f => '@/' + f)
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
      console.error(pretty.colorize(line));
    }
  },
  info(str: string) {
    for (const line of str.split('\n')) {
      console.info(pretty.colorize(line));
    }
  }
};

let ok = true;

const readFile = (file: string): string | Error => {
  let text: string | null = null;

  // TODO: Need to handle 'files' like (stdin) and (compiler) better
  if (file.slice(0, 2) !== '@/' && file[0] !== '(') {
    throw new Error('Expected a local read: ' + file);
  }

  try {
    text = readFileSync(file.slice(2)).toString();
  } catch {}

  if (text === null) {
    return new Error('not found');
  }

  return text;
};

const allNotes: Note[] = Compiler.compile(
  files,
  readFile,
  { stepLimit: 3000000 },
);

log.info('>>> info: ' + allNotes[allNotes.length - 1].message);
console.error();

const moreFiles = [...files];

for (const note of allNotes) {
  if (typeof note.pos === 'string') {
    continue;
  }

  if (moreFiles.indexOf(note.pos[0]) === -1) {
    moreFiles.push(note.pos[0]);
  }
}

for (const file of moreFiles) {
  const fileText = readFile(file);

  const notes = Note.flatten(allNotes.filter(n => n.pos[0] === file));

  if (typeof fileText === 'string') {
    const lines = fileText.split('\n');
    let lineNo = 0;
    for (const line of lines) {
      lineNo++;

      const tags = Tags(line, file, lineNo);

      const lineNotes = notes.filter(({ pos: [, range] }) => (
        range && range[0][0] === lineNo
      ));

      for (const level of ['error', 'warn', 'info']) {
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
            const prettyLines = pretty.ErrorContext(note, fileText);

            for (const prettyLine of prettyLines) {
              console.error(prettyLine);
            }
          }
        }
      }

      for (const note of lineNotes) {
        const nonLevelTags = note.tags.filter(t => (
          ['error', 'warn', 'info'].indexOf(t) === -1
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
}

const unseenTagLimit = 5;

const unseenTagList = (Object
  .keys(unseenTags)
  .map(tag => {
    const matchingNote = allNotes.find(n =>
      n.tags.indexOf(tag as Note.Tag) !== -1
    );

    return { tag, matchingNote };
  })
  .sort((a, b) => {
    if (a.matchingNote && !b.matchingNote) {
      return -1;
    }

    if (b.matchingNote && !a.matchingNote) {
      return 1;
    }

    return a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0;
  })
);

const unseenTagLen = unseenTagList.length;

for (const tagInfo of unseenTagList.slice(0, unseenTagLimit)) {
  log.error(
    '>>> error: unseen tag: ' +
    tagInfo.tag +
    (
      tagInfo.matchingNote ?
      ` (produced at ${formatLocation(tagInfo.matchingNote.pos)})` :
      ''
    )
  );

  ok = false;
}

if (unseenTagLen > 5) {
  log.error(`>>> error: ${unseenTagLen - 5} more unseen tags`);
}

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
