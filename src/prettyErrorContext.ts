import chalk from 'chalk';

import Note from './Note';
type FileNote = Note.FileNote;

const iStart = 0;
const iEnd = 1;
const iLine = 0;
const iCol = 1;

export default function prettyErrorContext(
  note: FileNote,
  text: string,
): string[] {
  // TODO: Why does typescript require this?
  const pos = note.pos;

  if (!pos) {
    return [];
  }

  const output = [];

  const textLines = text.split('\n').map(line => {
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
  const ctxFirstLine = Math.max(0, pos[iStart][iLine] - 2);
  const ctxLastLine = Math.min(pos[iEnd][iLine] + 1, textLines.length);

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
  lineNoSpaces = chalk.reset(chalk.bgMagenta(lineNoSpaces));

  if (ctxFirstLine === 0) {
    output.push(lineNoSpaces + chalk.reset(chalk.cyan(' func {')));
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

        case 'warn': {
          return chalk.reset(chalk.yellow(str));
        }

        case 'info': {
          return chalk.reset(chalk.blue(str));
        }
      }
    }

    if (lineNo === pos[iStart][iLine] && lineNo === pos[iEnd][iLine]) {
      line = (
        line.slice(0, pos[iStart][iCol]) +
        addLevelColor(line.slice(
          pos[iStart][iCol],
          pos[iEnd][iCol] + 1,
        )) +
        line.slice(pos[iEnd][iCol] + 1)
      );
    } else if (lineNo === pos[iStart][iLine]) {
      line = (
        line.slice(0, pos[iStart][iCol]) +
        addLevelColor(line.slice(pos[iStart][iCol]))
      );
    } else if (lineNo === pos[iEnd][iLine]) {
      line = (
        addLevelColor(line.slice(0, pos[iEnd][iCol] + 1)) +
        line.slice(pos[iEnd][iCol] + 1)
      );
    } else if (pos[iStart][iLine] < lineNo && lineNo < pos[iEnd][iLine]) {
      line = addLevelColor(line);
    }

    if (lineNo === pos[iEnd][iLine]) {
      let spacer = '';
      const len = Math.min(pos[iStart][iCol], pos[iEnd][iCol]);

      while (spacer.length < len) {
        spacer += ' ';
      }

      line += [
        `\n${lineNoSpaces}  ${spacer}`,
        addLevelColor('^') + ' ' + note.message,
      ].join('');

      line += [
        `\n${lineNoSpaces}  ${spacer}  `,
        note.tags.map(t => '#' + t).join(' '),
      ].join('');
    }

    line = `${lineNoStr(lineNo)}  ${line}`;

    return line;
  });

  output.push(...lines);

  if (ctxLastLine === textLines.length) {
    output.push(lineNoSpaces + chalk.reset(chalk.cyan(' }')));
  }

  output.push('');

  return output;
}
