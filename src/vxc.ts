import * as fs from 'fs';
import * as minimist from 'minimist';

import colorize from './colorize';
import Compiler from './Compiler';
import formatLocation from './formatLocation';
import getStdin from './getStdin';
import Note from './Note';
import prettyErrorContext from './prettyErrorContext';

type FileNote = Note.FileNote;

const args = minimist(process.argv.slice(2));

type Err = {
  type: 'error',
  value: Error,
};

function Err(msg: string): Err {
  return {
    type: 'error',
    value: new Error(msg),
  };
}

// TODO: Throw on unrecognized options

type Option<T> = {
  variations: string[],
  parse: (value: string | number | boolean | null) => T | Err,
};

type Parser<T> = (value: string | number | boolean | null) => T | Err;

function Option<T>(
  variations: string[],
  parse: Parser<T>,
): Option<T> {
  return { variations, parse };
}

type ParsedOption<T> = {
  name: string,
  variant: string | null,
  value: T,
};

function parseOption<T>(
  { variations, parse }: Option<T>
): ParsedOption<T> | Err {
  let result: ParsedOption<T> | null = null;

  for (const variant of variations) {
    if (variant in args) {
      if (result !== null) {
        return Err(`Option (${variations.join(' | ')}) is duplicated`);
      }

      const value = parse(args[variant]);

      // TODO: Hmm...
      if (
        typeof value === 'object' &&
        value !== null &&
        value['type'] === 'error'
      ) {
        return Err((value as Err).value.message + ' (got: ' + args[variant] + ')');
      }

      result = {
        name: variations[0],
        variant,
        value: value as T, // TODO: Hmm again
      };
    }
  }

  if (result === null) {
    const value = parse(null);

    // TODO: Fix duplicated code
    if (
      typeof value === 'object' &&
      value !== null &&
      value['type'] === 'error'
    ) {
      return Err((value as Err).value.message + ' (got: null)');
    }

    result = {
      name: variations[0],
      variant: null,
      value: value as T,
    };
  }

  return result;
}

function parse<T>(variations: string[], parseOpt: Parser<T>): ParsedOption<T> | Err {
  return parseOption(Option(variations, parseOpt));
}

type Format = 'pretty' | 'compact' | 'native' | 'vim-ale';
const formats: Format[] = ['pretty', 'compact', 'native', 'vim-ale'];

function isFormat(value: any): value is Format {
  return formats.indexOf(value) !== -1;
}

const format = parse<Format>(['format', 'f'], value => {
  if (value === null) {
    return 'pretty';
  }

  if (!isFormat(value)) {
    return Err('invalid format');
  }

  return value;
});

if (typeof format.value !== 'string') {
  throw format.value;
}

if (args._.indexOf('-') !== -1 && args._.length > 1) {
  throw new Error('Refusing to read from both files and stdin');
}

const inputs: ({ type: 'file', name: string } | string)[] = [];

(async () => {
  for (const arg of args._) {
    if (arg === '-') {
      inputs.push(await getStdin());
    } else {
      inputs.push({ type: 'file', name: arg });
    }
  }

  if (inputs.length === 0) {
    throw new Error('no input files');
  }

  const readFile = (file: string) => {
    let text: string | null = null;

    if (file.slice(0, 2) !== '@/') {
      throw new Error('Expected a local read: ' + file);
    }

    try {
      text = fs.readFileSync(file.slice(2)).toString()
    } catch {}

    return text;
  };

  for (const input of inputs) {
    let text: string | null = null;

    try {
      text = (
        typeof input === 'string' ?
        input :
        fs.readFileSync(input.name).toString()
      );
    } catch {}

    const file = '@/' + (typeof input === 'string' ? '(stdin)' : input.name);

    let notes = Compiler.compile([file], f => f === file ? text : readFile(f));

    if (format.value !== 'native') {
      // TODO: Need to remove Note/FileNote distinction
      notes = Note.flatten(notes as Note[]) as any;
    }

    if (format.value === 'pretty' && notes.length > 0) {
      console.log();
    }

    for (const note of notes) {
      switch (format.value) {
        case 'pretty': {
          // TODO: Make this better
          prettyPrint({ file, ...note }, text || '');

          break;
        }

        case 'compact': {
          compactPrint({ file, ...note });

          break;
        }

        case 'native': {
          // TODO: compile should generate file property
          console.error(JSON.stringify({ file, ...note }));
          break;
        }

        case 'vim-ale': {
          if (note.file !== '@/(stdin)' || !note.pos) {
            break;
          }

          console.error(JSON.stringify({
            lnum: note.pos[0][0],
            end_lnum: note.pos[1][0],
            col: note.pos[0][1],
            end_col: note.pos[1][1],
            text: `${note.message} ${note.tags.map(t => '#' + t).join(' ')}`,
            type: note.level[0].toUpperCase(),
          }));

          break;
        }

        default:
          // TODO: Why doesn't typescript know this is impossible?
          throw new Error('Should not be possible');
      };
    }
  }
})().catch(e => {
  setTimeout(() => { throw e; });
});

function prettyLocation(note: FileNote) {
  if (!note.pos) {
    return `${note.file}:`;
  }

  return `${note.file}:${formatLocation(note.pos)}:`;
}

function compactPrint(note: FileNote) {
  console.error(colorize(
    `${prettyLocation(note)} ${note.level}: ${note.message} ` +
    note.tags.map(t => '#' + t).join(' ')
  ));
}

function prettyPrint(note: FileNote, text: string) {
  if (!note.pos) {
    compactPrint(note);
    console.error();
    return;
  }

  console.error(colorize(
    `${prettyLocation(note)} ${note.level}:`
  ));

  for (const line of prettyErrorContext(note, text)) {
    console.error(line);
  }
}
