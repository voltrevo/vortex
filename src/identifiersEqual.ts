import Syntax from './parser/Syntax';

export default function identifiersEqual(
  a: Syntax.Identifier,
  b: Syntax.Identifier,
) {
  return (
    a.v === b.v &&
    a.p[0][0] === b.p[0][0] &&
    a.p[0][1] === b.p[0][1] &&
    a.p[1][0] === b.p[1][0] &&
    a.p[1][1] === b.p[1][1]
  );
}
