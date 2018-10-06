import assert from './assert';
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
  const categories = ['parse', 'validation', 'analysis', 'statistics'];
  const hasCategory = tags.some(t => categories.indexOf(t) !== -1);
  assert(hasCategory);

  return {
    ...(el.p ? { pos: el.p } : {}),
    level,
    tags: [level, ...tags],
    message,
  };
}

export type FileNote = Note & { file: string };

export default Note;
