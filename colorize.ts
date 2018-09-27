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

export default function colorize(line: string) {
  if (line === '') {
    return line;
  }

  const location = grab(line, /^[\w.()\/]+(:[LC0-9-]+)?(:[LC0-9-]+)?:/);
  const file = grab(location, /^[^:]+/);
  const lineNo = grab(location, /[LC0-9-]+/);

  const column = grab(
    location.split(lineNo || '@invalid').slice(1).join(lineNo || '@invalid'),
    /[LC0-9-]+/
  );

  const rest = (
    !location ?
    line :
    line.split(location).slice(1).join(location)
  );

  return (
    (
      location ?
      Location(file, lineNo, column) :
      ''
    ) +
    chalk.reset(rest
      .replace(/\berror\b/g, chalk.reset(chalk.red('error')))
      .replace(/\bwarning\b/g, chalk.reset(chalk.yellow('warning')))
      .replace(/\binfo\b/g, chalk.reset(chalk.blue('info')))
      .replace(/\btodo\b/g, chalk.reset(chalk.magenta('todo')))
      .replace(/\bERROR\b/g, chalk.reset(chalk.red('ERROR')))
      .replace(/\bWARNING\b/g, chalk.reset(chalk.yellow('WARNING')))
      .replace(/\bINFO\b/g, chalk.reset(chalk.blue('INFO')))
      .replace(/\bTODO\b/g, chalk.reset(chalk.magenta('TODO')))
      .replace(/\bTODOs\b/g, chalk.reset(chalk.magenta('TODO')) + 's')
    )
  );
}
