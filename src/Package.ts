import Note from './Note';
import Syntax from './parser/Syntax';
import traverse from './traverse';

type Package = {
  modules: {
    [file: string]: (
      Package.Module |
      Package.ParserNotes |
      undefined
    );
  };
  dependencies: Package.Dependencies;
  notes: Note.FileNote[];
};

function Package(): Package {
  return {
    modules: {},
    dependencies: {
      local: [],
      remote: {},
    },
    notes: [],
  };
}

namespace Package {
  export type Module = {
    t: 'Module';
    program: Syntax.Program;
    dependencies: Dependencies;
    notes: Note.FileNote[];
  };

  export type Dependencies = {
    local: string[];
    remote: {
      [pack: string]: undefined | string[];
    };
  };

  export type ParserNotes = {
    t: 'ParserNotes';
    notes: Note.FileNote[];
  };

  export function set(
    pack: Package,
    file: string,
    text: string | null,
  ): Package {
    const moduleEntry = parse(file, text);

    pack = { ...pack,
      modules: { ...pack.modules,
        [file]: moduleEntry,
      },
      dependencies: { ...pack.dependencies,
        local: pack.dependencies.local.filter(dep => dep !== file),
      },
      notes: [...pack.notes, ...moduleEntry.notes],
    };

    let newDependencies = pack.dependencies;

    if (moduleEntry.t === 'Module') {
      newDependencies = { ...newDependencies,
        local: [
          ...pack.dependencies.local,
          ...moduleEntry.dependencies.local.filter(dep => (
            dep !== file &&
            pack.dependencies.local.indexOf(dep) === -1
          ))
        ],
      };

      for (
        const ext of
        Object.keys(moduleEntry.dependencies.remote)
      ) {
        let extFiles = moduleEntry.dependencies.remote[ext];

        if (extFiles === undefined) {
          throw new Error('Shouldn\'t be possible');
        }

        const existing = pack.dependencies.remote[ext];

        if (existing === undefined) {
          pack = { ...pack,
            dependencies: { ...pack.dependencies,
              remote: { ...pack.dependencies.remote,
                [ext]: [...extFiles],
              },
            },
          };
        } else {
          pack = { ...pack,
            dependencies: { ...pack.dependencies,
              remote: { ...pack.dependencies.remote,
                [ext]: [...existing,
                  ...extFiles.filter(f => existing.indexOf(f) === -1),
                ],
              },
            },
          };
        }
      }
    }

    pack = { ...pack,
      dependencies: newDependencies,
    };

    return pack;
  }

  export function setLocalDependencies(
    pack: Package,
    readFile: (file: string) => string | null,
  ): Package {
    while (pack.dependencies.local.length > 0) {
      const file = pack.dependencies.local[0];
      pack = Package.set(pack, file, readFile(file));
    }

    return pack;
  }

  export function parse(
    file: string,
    text: string | null,
  ): Module | ParserNotes {
    if (text === null) {
      return {
        t: 'ParserNotes',
        notes: [{
          file,
          level: 'error',
          tags: ['error', 'package', 'not-found'],
          message: 'File not found: ' + file,
        }],
      };
    }

    const fileParts = file.split('/');
    const dirname = fileParts.slice(0, fileParts.length - 1).join('/');

    const notes: Note.FileNote[] = [];
    let program: Syntax.Program | null = null;

    try {
      program = Syntax.Program(text);
    } catch (e) {
      if (e.hash) {
        notes.push({
          file,
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
          file,
          level: 'error',
          tags: ['error', 'syntax', 'internal'],
          message: e.message,
        });
      }

      return {
        t: 'ParserNotes',
        notes,
      };
    }

    const imports = traverse<Syntax.Element, Syntax.Import>(
      program,
      el => el.t === 'import' ? [el] : [],
      Syntax.Children,
    );

    const dependencies: Dependencies = {
      local: [],
      remote: {},
    };

    for (const import_ of imports) {
      let { v: [name, source] } = import_;
      const nameStr = name.v + '.vx';

      const sourceStr = (
        source === null ?
        '.' :
        source.v.slice(1, source.v.length - 1)
      );

      let [sourceEntry, ...sourceRest] = sourceStr.split('/');

      if (sourceEntry !== '.' && sourceEntry !== '..') {
        let packageDeps = (
          sourceEntry === '@' ?
          dependencies.local :
          dependencies.remote[sourceEntry]
        );

        if (packageDeps === undefined) {
          packageDeps = [];
          dependencies.remote[sourceEntry] = packageDeps;
        }

        packageDeps.push([...sourceRest, nameStr].join('/'));
        continue;
      }

      let dirPath = dirname === '' ? [] : dirname.split('/');

      while (sourceEntry === '..') {
        if (dirPath.length === 0) {
          notes.push(Note.FileNote(
            file,
            import_,
            'error',
            ['package', 'invalid-import-source'],
            'Import source is above the package root',
          ));

          break;
        }

        dirPath.pop();
        [sourceEntry, ...sourceRest] = sourceRest;
      }

      if (sourceEntry === '..') {
        break;
      }

      const resolvedPath = [
        ...dirPath,
        ...(
          sourceEntry === undefined || sourceEntry === '.' ?
          [] :
          [sourceEntry]
        ),
        ...sourceRest,
        nameStr,
      ].join('/');

      dependencies.local.push(resolvedPath);
    }

    return {
      t: 'Module',
      program,
      dependencies,
      notes,
    };
  }
}

export default Package;
