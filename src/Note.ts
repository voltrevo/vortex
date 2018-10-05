import Syntax from './parser/Syntax';

type Note = {
  pos?: Syntax.Pos,
  level: 'error' | 'warning' | 'info';
  tags: string[],
  message: string;
};

function Note(
  el: { p?: Syntax.Pos },
  level: 'error' | 'warning' | 'info',
  tags: string[],
  message: string,
) {
  return {
    ...(el.p ? { pos: el.p } : {}),
    level,
    tags: [level, ...tags],
    message,
  };
}

export default Note;
