import Syntax from './parser/Syntax';

export default function formatLocation(pos: Syntax.Pos) {
  if (pos.first_line === pos.last_line) {
    return `${pos.first_line}:${pos.first_column}-${pos.last_column}`;
  }

  return (
    `L${pos.first_line}C${pos.first_column}-` +
    `L${pos.last_line}C${pos.last_column}`
  );
}
