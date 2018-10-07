import chalk from 'chalk';

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

export default function colorize(line: string) {
  if (line === '') {
    return line;
  }

  const location = grab(line, /^[\w.()\/]+(:[LC0-9-]+)?(:[LC0-9-]+)?:/);
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
