import * as fs from 'fs';
import * as minimist from 'minimist';

import VasmSyntax from './parser/vasm/Syntax';
import ByteCoder from './ByteCoder';
import Compiler from './Compiler';
import getStdin from './getStdin';
import Note from './Note';
import pretty from './pretty';
import serializeVasmTree from './serializeVasmTree';

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

const inputs: { type: 'file', name: string }[] = [];

(async () => {
  let stdinText: string | null = null;

  if (args._.indexOf('-') !== -1) {
    stdinText = await getStdin();
  }

  for (let arg of args._) {
    if (arg === '-') {
      arg = '(stdin)';
    }

    inputs.push({ type: 'file', name: arg });
  }

  if (inputs.length === 0) {
    throw new Error('no input files');
  }

  const fileCache: { [file: string]: string | Error } = {};

  const readFile = (file: string) => {
    if (file === '(compiler)') {
      return new Error('invalid');
    }

    if (file === '@/(stdin)') {
      if (stdinText === null) {
        throw new Error('Shouldn\'t be possible');
      }

      return stdinText;
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

  const files = inputs.map(input => '@/' + input.name);

  let [notes, az] = Compiler.compile(
    files,
    readFile,
    { stepLimit: 1000000 }, // TODO: Make this configurable
  );

  if (format.value !== 'native') {
    notes = Note.flatten(notes as Note[]);
  }

  if (format.value === 'pretty' && notes.length > 0) {
    console.error();
  }

  for (const note of notes) {
    switch (format.value) {
      case 'pretty': {
        // TODO: Make this better
        pretty.print(note, readFile(note.pos[0]));
        break;
      }

      case 'compact': {
        pretty.printCompact(note);
        break;
      }

      case 'native': {
        console.error(JSON.stringify(note));
        break;
      }

      case 'vim-ale': {
        const [file, range] = note.pos;

        if (file !== '@/(stdin)' || range === null) {
          break;
        }

        console.error(JSON.stringify({
          lnum: range[0][0],
          end_lnum: range[1][0],
          col: range[0][1],
          end_col: range[1][1],
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

  if (args.vasm || args.code) {
    if (args.vasm && args.code) {
      throw new Error('Only one of --vasm, --code should be provided');
    }

    if (files.length !== 1) {
      throw new Error('Emitting code is only supported for one file');
    }

    const file = files[0];

    const mod = az.pack.modules[file];

    if (!mod) {
      throw new Error('Should not be possible');
    }

    if (mod.t === 'ParserNotes') {
      throw new Error('Can\'t emit bytecode for file that failed parsing');
    } else {
      const coder = ByteCoder(file);
      const lines = ByteCoder.Block(coder, mod.program);

      if (args.vasm) {
        console.log(lines.join('\n'));
      } else {
        const vasmTree = VasmSyntax.Program(lines.join('\n'));
        const codeLines = serializeVasmTree(vasmTree);

        console.log(codeLines.join('\n'));
      }
    }
  }
})().catch(e => {
  setTimeout(() => { throw e; });
});
