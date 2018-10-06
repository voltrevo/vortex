import assert from './assert';
import Syntax from './parser/Syntax';

type Note = {
  pos?: Syntax.Pos,
  level: 'error' | 'warning' | 'info';
  tags: string[],
  message: string;
  subnotes?: Note[];
};

function Note(
  el: { p?: Syntax.Pos },
  level: 'error' | 'warning' | 'info',
  tags: string[],
  message: string,
  subnotes?: Note[],
) {
  const categories = ['syntax', 'validation', 'analysis', 'statistics'];
  const hasCategory = tags.some(t => categories.indexOf(t) !== -1);
  assert(hasCategory);

  return {
    ...(el.p ? { pos: el.p } : {}),
    level,
    tags: [level, ...tags],
    message,
    ...(subnotes ? { subnotes } : {}),
  };
}

namespace Note {
  export type FileNote = Note & { file: string };

  export function flatten(notes: Note[]): Note[] {
    const newNotes: Note[] = [];

    for (const note of notes) {
      newNotes.push(note);

      if (note.subnotes) {
        newNotes.push(...flatten(note.subnotes));
      }
    }

    return newNotes;
  }
}

export default Note;
