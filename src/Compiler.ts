import { default as Analyzer, Outcome } from './Analyzer';
import Note from './Note';
import Package from './Package';
import SecondsDiff from './SecondsDiff';
import { validate } from './validate';

namespace Compiler {
  function Time() {
    if ('hrtime' in process) {
      return process.hrtime();
    }

    return Date.now();
  }

  function TimeDiff(before: any, after: any) {
    if ('hrtime' in process) {
      return SecondsDiff(before, after);
    }

    return (after - before) / 1000;
  }

  export function compile(
    files: string[],
    readFile: (f: string) => string | Error,
    opt: { stepLimit?: number } = {},
  ): [Note[], Analyzer] {
    let res: [Note[], Analyzer];

    try {
      res = compileImpl(files, readFile, opt);
    } catch (error) {
      res = [
        [
          Note(
            ['(compiler)', null],
            'error',
            ['internal'],
            'Internal error (please report this bug): ' + error.stack
          ),
        ],
        Analyzer(Package()),
      ];
    }

    return res;
  }

  function compileImpl(
    files: string[],
    readFile: (f: string) => string | Error,
    opt: { stepLimit?: number } = {},
  ): [Note[], Analyzer] {
    const before = Time();

    let pack = Package();

    for (const file of files) {
      pack = Package.set(pack, file, readFile(file));
    }

    pack = Package.setLocalDependencies(pack, readFile);

    const notes: Note[] = [...pack.notes];

    for (const f of Object.keys(pack.modules)) {
      const m = pack.modules[f];

      if (m === undefined || m.t !== 'Module') {
        continue;
      }

      const validationNotes = validate(m.program);

      notes.push(...validationNotes);

      if (validationNotes.some(n => n.level === 'error')) {
        pack = { ...pack,
          modules: { ...pack.modules,
            // TODO: Make a better solution here, saying there were parser
            // notes is not correct
            [f]: { t: 'ParserNotes', notes: [] },
          },
        };
      }
    }

    let az = Analyzer(pack, opt);

    for (const f of Object.keys(pack.modules)) {
      const m = pack.modules[f];

      if (m === undefined || m.t !== 'Module') {
        continue;
      }

      let mod: Analyzer.Module_;
      [mod, az] = Analyzer.runFile(az, f);
    }

    for (const f of Object.keys(az.modules)) {
      const m = az.modules[f];

      if (m === undefined) {
        throw new Error('Shouldn\'t be possible');
      }

      if (!m.loaded) {
        continue;
      }

      notes.push(...m.notes);

      if (files.indexOf(f) !== -1 && m.outcome) {
        notes.push(Note(
          [f, null],
          'info',
          ['compiler', 'file-outcome'],
          `Outcome: ${Outcome.LongString(m.outcome)}`,
        ));
      }
    }

    const after = Time();
    const timeDiff = TimeDiff(before, after);

    notes.push(Note(
      ['(compiler)', null],
      'info',
      ['statistics', 'compile-time'],
      (
        // TODO: plural
        `Compiled ${files.length} file(s), ` +
        `${az.steps} steps, ` +
        `${(1000 * timeDiff).toFixed(3)}ms, ` +
        `${(1e6 * timeDiff / az.steps).toFixed(3)}μs/step`
      )
    ));

    return [notes, az];
  }

  export function compileText(text: string): [Note[], Analyzer] {
    return compile(
      ['(anonymous)'],
      f => f === '(anonymous)' ? text : new Error('isolated text compilation'),
    );
  }
}

export default Compiler;
