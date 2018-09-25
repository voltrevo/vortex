import { Syntax, parse } from './parser/parse';
import { validate } from './validation/validate';

type Note = {
  message: string;
  level: 'error' | 'warning' | 'info';
  pos: Syntax.Pos,
};

export default function compile(text: string) {
  const notes: Note[] = [];

  let program: null | Syntax.Program = null;

  try {
    program = parse(text);
  } catch (e) {
    if (e.hash) {
      notes.push({
        level: 'error',
        message: e.message.split('\n')[3],
        pos: e.hash.loc,
      });
    } else {
      notes.push({
        level: 'error',
        message: e.message,
        pos: {
          first_line: 1,
          last_line: 1,
          first_column: 1,
          last_column: 1,
        },
      });
    }
  }

  if (program) {
    notes.push(...validate(program));
  }

  return notes;
}
