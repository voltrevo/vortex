import * as fs from 'fs';
import * as minimist from 'minimist';

import compile from './compile';
import getStdin from './getStdin';

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

type Format = 'pretty' | 'native' | 'vim-ale';
const formats: Format[] = ['pretty', 'native', 'vim-ale'];

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

  for (const input of inputs) {
    const text = (
      typeof input === 'string' ?
      input :
      fs.readFileSync(input.name).toString()
    );

    const file = typeof input === 'string' ? '(stdin)' : input.name;

    const notes = compile(text);

    for (const note of notes) {
      switch (format.value) {
        case 'native': {
          // TODO: compile should generate file property
          console.error(JSON.stringify({ file, ...note }));
          break;
        }

        case 'vim-ale': {
          console.error(JSON.stringify({
            lnum: note.pos.first_line,
            end_lnum: note.pos.last_line,
            col: note.pos.first_column,
            end_col: note.pos.last_column,
            text: note.message,
            type: note.level[0].toUpperCase(),
          }));

          break;
        }

        case 'pretty': {
          // TODO: Make this better
          console.error(`${file}:${note.pos.first_line}: ${note.message}`);

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
