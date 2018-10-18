import Note from './Note';

export default function formatLocation(pos: Note.Pos) {
  const [file, range] = pos;

  if (range === null) {
    return file;
  }

  if (range[0][0] === range[1][0]) {
    if (range[0][1] === range[1][1]) {
      return `${file}:${range[0][0]}:${range[0][1]}`;
    }

    return `${file}:${range[0][0]}:${range[0][1]}-${range[1][1]}`;
  }

  return (
    `${file}:` +
    `L${range[0][0]}C${range[0][1]}-` +
    `L${range[1][0]}C${range[1][1]}`
  );
}
