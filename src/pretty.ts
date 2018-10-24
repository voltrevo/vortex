import chalk from 'chalk';

import formatLocation from './formatLocation';
import Note from './Note';

namespace pretty {
  export function printCompact(note: Note) {
    console.error(CompactString(note));
  }

  export function CompactString(note: Note) {
    return colorize(
      `${Location(note)} ${note.level}: ${note.message} ` +
      note.tags.map(t => '#' + t).join(' ')
    );
  }

  function Location(note: Note) {
    if (typeof note.pos === 'string') {
      return note.pos + ':';
    }

    return formatLocation(note.pos) + ':';
  }

  export function print(note: Note, text: string | null) {
    if (text === null) {
      printCompact(note);
      console.error();
      return;
    }

    for (const line of ErrorContext(note, text)) {
      console.error(line);
    }
  }

  export function colorize(line: string) {
    // TODO: Fix shadow
    function Location(file: string, line: string, column: string) {
      return (chalk.reset(
        chalk.magenta(file) +
        chalk.cyan(':') +
        (
          line ?
          chalk.green(line) + chalk.cyan(':') :
          ''
        ) +
        (
          column ?
          chalk.green(column) + chalk.cyan(':') :
          ''
        )
      ));
    }

    function grab(str: string, re: RegExp): string {
      return (str.match(re) || [''])[0];
    }

    function assert(value: any) {
      if (!value) {
        throw new Error('Assertion failure');
      }
    }

    function dropPrefix(prefix: string, line: string) {
      assert(line.substring(0, prefix.length) === prefix);
      return line.substring(prefix.length);
    }

    if (line === '') {
      return line;
    }

    const location = grab(line, /^[@\w.()\/]+(:[LC0-9-]+)?(:[LC0-9-]+)?:/);
    const file = grab(location, /^[^:]+/);
    const lineNo = grab(dropPrefix(file, location), /[LC0-9-]+/);

    const column = grab(
      dropPrefix(`${file ? file + ':' : ''}${lineNo ? lineNo + ':' : ''}`, location),
      /[LC0-9-]+/
    );

    const rest = dropPrefix(location, line);

    return (
      (
        location ?
        Location(file, lineNo, column) :
        ''
      ) +
      chalk.reset(rest
        .replace(/\berror\b/g, chalk.reset(chalk.red('error')))
        .replace(/\bwarn\b/g, chalk.reset(chalk.yellow('warn')))
        .replace(/\binfo\b/g, chalk.reset(chalk.blue('info')))
        .replace(/\btodo\b/g, chalk.reset(chalk.magenta('todo')))
        .replace(/\bERROR\b/g, chalk.reset(chalk.red('ERROR')))
        .replace(/\bWARN\b/g, chalk.reset(chalk.yellow('WARN')))
        .replace(/\bINFO\b/g, chalk.reset(chalk.blue('INFO')))
        .replace(/\bTODO\b/g, chalk.reset(chalk.magenta('TODO')))
        .replace(/\bTODOs\b/g, chalk.reset(chalk.magenta('TODO')) + 's')
      )
    );
  }

  export function ErrorContext(
    note: Note,
    text: string,
  ): string[] {
    const iStart = 0;
    const iEnd = 1;
    const iLine = 0;
    const iCol = 1;

    // TODO: Why does typescript require this?
    const [, pos] = note.pos;

    if (!pos) {
      return [CompactString(note), ''];
    }

    const output = [];

    output.push(colorize(
      `${Location(note)} ${note.level}:`
    ));

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
          line.slice(0, pos[iStart][iCol] - 1) +
          addLevelColor(line.slice(
            pos[iStart][iCol] - 1,
            pos[iEnd][iCol],
          )) +
          line.slice(pos[iEnd][iCol])
        );
      } else if (lineNo === pos[iStart][iLine]) {
        line = (
          line.slice(0, pos[iStart][iCol] - 1) +
          addLevelColor(line.slice(pos[iStart][iCol] - 1))
        );
      } else if (lineNo === pos[iEnd][iLine]) {
        line = (
          addLevelColor(line.slice(0, pos[iEnd][iCol])) +
          line.slice(pos[iEnd][iCol])
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
}

export default pretty;
