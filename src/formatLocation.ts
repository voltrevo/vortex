import Syntax from './parser/Syntax';

export default function formatLocation(pos: Syntax.Pos) {
  const [start, end] = pos;

  if (start[0] === end[0]) {
    return `${start[0]}:${start[1]}-${end[1]}`;
  }

  return (
    `L${start[0]}C${start[1]}-` +
    `L${end[0]}C${end[1]}`
  );
}
