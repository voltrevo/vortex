import chalk from 'chalk';

import { Note } from './compile';

export default function prettyErrorContext(
  note: Note & { file: string, text: string },
): string[] {
  const output = [];

  const textLines = note.text.split('\n').map(line => {
    if (line.indexOf('//') === -1) {
      return line;
    }

    const [code, ...comment] = line.split('//');

    return code + chalk.reset(chalk.grey('//' + comment.join('//')));
  });

  if (textLines[textLines.length - 1] === '') {
    textLines.pop();
  }

  // Add a line of context before and after
  const ctxFirstLine = Math.max(0, note.pos.first_line - 2);
  const ctxLastLine = Math.min(note.pos.last_line + 1, textLines.length);

  const numWidth = Math.max(3, 1 + (ctxLastLine + 1).toString().length);

  function lineNoStr(n: number): string {
    let numStr = n.toString();

    while (numStr.length < numWidth) {
      numStr = ' ' + numStr;
    }

    numStr += ' ';

    return `${chalk.reset(chalk.bgMagenta.bold.green(numStr))} `;
  }

  let lineNoSpaces = '';

  while (lineNoSpaces.length < numWidth) {
    lineNoSpaces += ' ';
  }

  lineNoSpaces += ' ';
  lineNoSpaces = chalk.bgMagenta(lineNoSpaces);

  if (ctxFirstLine === 0) {
    output.push(chalk.reset(chalk.cyan(`${lineNoSpaces} func {`)));
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
  });

  output.push(...lines);

  if (ctxLastLine === textLines.length) {
    output.push(chalk.reset(chalk.cyan(`${lineNoSpaces} }`)));
  }

  output.push('');

  return output;
}
