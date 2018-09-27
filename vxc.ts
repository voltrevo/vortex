import * as fs from 'fs';
import * as minimist from 'minimist';

import chalk from 'chalk';

import colorize from './colorize';
import { default as compile, Note } from './compile';
import formatLocation from './formatLocation';
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

  for (const input of inputs) {
    const text = (
      typeof input === 'string' ?
      input :
      fs.readFileSync(input.name).toString()
    );

    const file = typeof input === 'string' ? '(stdin)' : input.name;

    const notes = compile(text);

    if (format.value === 'pretty' && notes.length > 0) {
      console.log();
    }

    for (const note of notes) {
      switch (format.value) {
        case 'pretty': {
          // TODO: Make this better
          prettyPrint({ file, text, ...note });

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

        default:
          // TODO: Why doesn't typescript know this is impossible?
          throw new Error('Should not be possible');
      };
    }
  }
})().catch(e => {
  setTimeout(() => { throw e; });
});

function prettyLocation(note: Note & { file: string }) {
  return `${note.file}:${formatLocation(note.pos)}:`;
}

function compactPrint(note: Note & { file: string }) {
  console.error(colorize(
    `${prettyLocation(note)} ${note.level}: ${note.message}`
  ));
}

function prettyPrint(note: Note & { file: string, text: string }) {
  console.error(colorize(prettyLocation(note)));

  const textLines = note.text.split('\n');

  if (textLines[textLines.length - 1] === '') {
    textLines.pop();
  }

  // Add a line of context before and after
  const ctxFirstLine = Math.max(0, note.pos.first_line - 2);
  const ctxLastLine = Math.min(note.pos.last_line + 1, textLines.length);

  const numWidth = (ctxLastLine + 1).toString().length;

  function lineNoStr(n: number): string {
    let numStr = n.toString();

    while (numStr.length < numWidth) {
      numStr = ' ' + numStr;
    }

    return `${chalk.reset(chalk.green(numStr))} `;
  }

  let lineNoSpaces = '';

  while (lineNoSpaces.length < numWidth) {
    lineNoSpaces += ' ';
  }

  lineNoSpaces += ' ';

  if (ctxFirstLine === 0) {
    console.error(chalk.reset(chalk.cyan(`${lineNoSpaces}func {`)));
  }

  const lines = textLines.slice(ctxFirstLine, ctxLastLine).map((line, i) => {
    const lineNo = ctxFirstLine + i + 1;

    function addLevelColor(str: string): string {
      if (str.indexOf('//') !== -1) {
        const [code, ...comment] = str.split('//');
        return addLevelColor(code) + '//' + comment.join('//');
      }

      switch (note.level) {
        case 'error': {
          return chalk.reset(chalk.red(str));
        }

        case 'warning': {
          return chalk.reset(chalk.yellow(str));
        }

        case 'info': {
          return chalk.reset(chalk.blue(str));
        }
      }
    }

    if (lineNo === note.pos.first_line && lineNo === note.pos.last_line) {
      line = (
        line.slice(0, note.pos.first_column) +
        addLevelColor(line.slice(
          note.pos.first_column,
          note.pos.last_column + 1,
        )) +
        line.slice(note.pos.last_column + 1)
      );
    } else if (lineNo === note.pos.first_line) {
      line = (
        line.slice(0, note.pos.first_column) +
        addLevelColor(line.slice(note.pos.first_column))
      );
    } else if (lineNo === note.pos.last_line) {
      line = (
        addLevelColor(line.slice(0, note.pos.last_column + 1)) +
        line.slice(note.pos.last_column + 1)
      );
    } else if (note.pos.first_line < lineNo && lineNo < note.pos.last_line) {
      line = addLevelColor(line);
    }

    if (lineNo === note.pos.first_line) {
      line += [
        ' ',
        chalk.reset(chalk.cyan('<')),
        ' ',
        addLevelColor(note.level),
        chalk.reset(chalk.cyan(':')),
        ' ',
        note.message,
      ].join('');
    }

    line = `${lineNoStr(lineNo)}  ${line}`;

    return line;
  }).join('\n');

  console.error(lines);

  if (ctxLastLine === textLines.length) {
    console.error(chalk.reset(chalk.cyan(`${lineNoSpaces}}`)));
  }

  console.error();
}
