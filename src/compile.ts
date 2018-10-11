import analyze from './analyze';
import Note from './Note';
import Syntax from './parser/Syntax';
import { validate } from './validate';

type Reader = (path: string) => string | null;

function parse(text: string): [Note[], Syntax.Program | null] {
  const notes: Note[] = [];
  let program: Syntax.Program | null = null;

  try {
    program = Syntax.Program(text);
  } catch (e) {
    if (e.hash) {
      notes.push({
        level: 'error',
        tags: ['error', 'syntax'],
        message: e.message.split('\n')[3],
        pos: [
          [e.hash.loc.first_line, e.hash.loc.first_column],
          [e.hash.loc.last_line, e.hash.loc.last_column],
        ],
      });
    } else {
      notes.push({
        level: 'error',
        tags: ['error', 'syntax', 'internal'],
        message: e.message,
        pos: [[1, 1], [1, 1]],
      });
    }
  }

  return [notes, program];
}

export default function compile(text: string, reader: Reader) {
  const [notes, program] = parse(text);

  if (program) {
    const importList: string[] = [];

    const importer = (importExp: Syntax.Import): Note[] => {
      const [name, source] = importExp.v;

      if (source !== undefined) {
        return [Note(
          importExp,
          'error',
          ['validation', 'not-implemented'],
          'Not implemented: import from expression',
        )];
      }

      if (importList.indexOf(name.v) !== -1) {
        return [Note(
          importExp,
          'error',
          ['validation', 'not-implemented'],
          (
            'Not implemented: recursive import: ' +
            [...importList, name.v].join(' -> ')
          ),
        )];
      }

      // TODO: capture mutation here / this is not a proper function
      importList.push(name.v);

      const importText = reader(name.v);

      if (importText === null) {
        return [Note(
          importExp,
          'error',
          ['validation', 'not-found'], // TODO: better tagging here
          'Import not found: ' + name.v,
        )];
      }

      const [importParseNotes, importProgram] = parse(importText);

      if (importParseNotes.length > 0) {
        return importParseNotes;
      }

      if (importProgram === null) {
        throw new Error('Shouldn\'t be possible (neither notes nor program)');
      }

      return (validate(importProgram, importer)
        .map(n => ({ ...n,
          message: 'Inside import: ' + n.message,
          pos: importExp.p,
        }))
      );
    };

    notes.push(...validate(
      program,
      importer,
    ));

    if (!notes.some(n => n.level === 'error')) {
      const { notes: analysisNotes } = analyze(program);
      notes.push(...analysisNotes);
    }
  }

  return notes;
}
