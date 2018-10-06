import analyze from './analyze';
import Note from './Note';
import Syntax from './parser/Syntax';
import { validate } from './validate';

export default function compile(text: string) {
  const notes: Note[] = [];

  let program: null | Syntax.Program = null;

  try {
    program = Syntax.Program(text);
  } catch (e) {
    if (e.hash) {
      notes.push({
        level: 'error',
        tags: ['parse'],
        message: e.message.split('\n')[3],
        pos: [
          [e.hash.loc.first_line, e.hash.loc.first_column],
          [e.hash.loc.last_line, e.hash.loc.last_column],
        ],
      });
    } else {
      notes.push({
        level: 'error',
        tags: ['parse', 'internal'],
        message: e.message,
        pos: [[1, 1], [1, 1]],
      });
    }
  }

  if (program) {
    notes.push(...validate(program));
    const { notes: analysisNotes } = analyze(program);
    notes.push(...analysisNotes);
  }

  return notes;
}
