import { Syntax } from './parser/parse';

type Note = {
  message: string;
  level: 'error' | 'warning' | 'info';
  pos?: Syntax.Pos,
};

function Note(
  el: { p?: Syntax.Pos },
  level: 'error' | 'warning' | 'info',
  message: string
) {
  return {
    message,
    level,
    ...(el.p ? { pos: el.p } : {}),
  };
}

export default Note;
