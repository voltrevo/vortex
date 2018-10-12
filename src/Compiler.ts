import analyze from './analyze';
import Note from './Note';
import Package from './Package';
import SecondsDiff from './SecondsDiff';
import { validate } from './validate';

namespace Compiler {
  export function compile(
    files: string[],
    readFile: (f: string) => string | null,
  ): Note.FileNote[] {
    const before = process.hrtime();

    let pack = Package();

    for (const file of files) {
      pack = Package.set(pack, file, readFile(file));
    }

    pack = Package.setLocalDependencies(pack, readFile);

    const notes: Note.FileNote[] = [...pack.notes];

    for (const f of Object.keys(pack.modules)) {
      const m = pack.modules[f];

      if (m === undefined || m.t !== 'Module') {
        continue;
      }

      const validationNotes = validate(m.program);

      notes.push(
        ...validate(m.program).map(n => ({ ...n, file: f }))
      );

      if (!validationNotes.some(n => n.level === 'error')) {
        const { notes: analysisNotes } = analyze(pack, f);
        notes.push(...analysisNotes.map(n => ({ ...n, file: f })));
      }
    }

    const after = process.hrtime();

    notes.push(Note.FileNote(
      '(compiler)',
      {},
      'info',
      ['statistics', 'compile-time'],
      (
        // TODO: plural
        `Compiled ${files.length} file(s) in ` +
        `${(1000 * SecondsDiff(before, after)).toFixed(3)}ms`
      )
    ));

    return notes;
  }

  export function compileText(text: string): Note.FileNote[] {
    return compile(
      ['(anonymous)'],
      f => f === '(anonymous)' ? text : null,
    );
  }
}

export default Compiler;