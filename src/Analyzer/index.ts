import checkNull from '../checkNull';
import Note from '../Note';
import Package from '../Package';
import Scope from '../Scope';
import Syntax from '../parser/Syntax';

export { default as Outcome } from './Outcome';
import Outcome from './Outcome';

type Analyzer = {
  pack: Package;
  fileStack: string[];
  modules: {
    [f: string]: Analyzer.Module_ | undefined;
  };
  scope: Analyzer.ScopeMapT;
};

function Analyzer(pack: Package): Analyzer {
  const modules: Analyzer['modules'] = {};

  for (const dep of Object.keys(pack.modules)) {
    const depEntry = pack.modules[dep];

    if (depEntry === undefined || depEntry.t === 'ParserNotes') {
      modules[dep] = {
        loaded: false,
        program: null,
        outcome: Outcome.Unknown(),
      };

      continue;
    }

    modules[dep] = {
      loaded: true,
      program: depEntry.program,
      outcome: null,
      notes: [],
    };
  }

  return {
    pack,
    fileStack: [],
    modules,
    scope: Analyzer.ScopeMapT(),
  };
}

namespace Analyzer {
  export type Module_ = (
    {
      loaded: true,
      program: Syntax.Program;
      outcome: null | Outcome;
      notes: Note[],
    } |
    {
      loaded: false,
      program: null;
      outcome: Outcome.Unknown;
    } |
    never
  );

  type FuncRef = {
    cat: 'ref';
    t: 'func-ref';
    v: Syntax.FunctionExpression;
  };

  type ImportRef = {
    cat: 'ref';
    t: 'import-ref';
    v: Syntax.Import;
  };

  type RefValue = (
    FuncRef |
    ImportRef |
    never
  );

  export type ScopeEntry = {
    origin: Syntax.Element;
    data: Outcome.Value | RefValue;
  };

  export type ScopeValueEntry = {
    origin: Syntax.Element;
    data: Outcome.Value;
  };

  export type ST = {
    root: {};
    entry: ScopeEntry;
  };

  export type ScopeT = Scope<ST>;
  export type ScopeMapT = Scope.Map<ST>;
  export type ScopeRootT = Scope.Root<ST>;

  export function ScopeMapT(): ScopeMapT {
    return Scope.Map<ST>({});
  }

  export function get(
    az: Analyzer,
    name: string,
  ): [ScopeValueEntry | null, Analyzer] {
    const entry = Scope.get(az.scope, name);

    if (entry === null) {
      return [null, az];
    }

    if (entry.data.cat !== 'ref') {
      // The intention is {return [entry, az]} but a limitation in typescript
      // requires it to be reconstructed like this.
      const entryCopy = {
        origin: entry.origin,
        data: entry.data,
      };

      return [entryCopy, az];
    }

    let mo = Outcome.Maybe();

    checkNull((() => {
      switch (entry.data.t) {
        case 'func-ref': {
          mo = Outcome.FuncPlain({ exp: entry.data.v, az });
          return null;
        }

        case 'import-ref': {
          [mo, az] = retrieveImport(
            az,
            entry.data.v,
          );

          return null;
        }
      }
    })());

    if (mo === null) {
      throw new Error('Shouldn\'t be possible');
    }

    if (mo.t === 'exception') {
      // TODO: This happens due to imports, and should be prevented elsewhere
      mo = Outcome.Unknown();
    }

    const out = {
      origin: entry.origin,
      data: mo,
    };

    return [out, az];
  }

  export function set(
    az: Analyzer,
    name: string,
    mods: Partial<ST['entry']['data']>,
  ): Analyzer {
    return { ...az,
      scope: Scope.set(az.scope, name, mods),
    };
  }

  export function add(
    analyzer: Analyzer,
    name: string,
    entry: ST['entry'],
  ): Analyzer {
    return { ...analyzer,
      scope: Scope.add(analyzer.scope, name, entry),
    };
  }

  export function push(
    analyzer: Analyzer,
  ): Analyzer {
    return { ...analyzer,
      scope: Scope.push(analyzer.scope),
    };
  }

  export function pop(
    analyzer: Analyzer,
  ): Analyzer {
    const newScope = Scope.pop(analyzer.scope);

    if ('root' in newScope) {
      throw new Error('Shouldn\'t be possible');
    }

    return { ...analyzer,
      scope: newScope,
    };
  }

  export function pushFile(az: Analyzer, file: string): Analyzer {
    return { ...az, fileStack: [file, ...az.fileStack] };
  }

  export function popFile(az: Analyzer): [string, Analyzer] {
    const [file, ...fileStack] = az.fileStack;
    return [file, { ...az, fileStack }];
  }

  export function addNote(
    az: Analyzer,
    note: Note,
  ): Analyzer {
    const file = note.pos[0];
    let module_ = az.modules[file];

    if (module_ === undefined || !module_.loaded) {
      throw new Error('Shouldn\'t be possible');
    }

    module_ = { ...module_,
      notes: [...module_.notes,
        { ...note,
          tags: ['analyzer', ...note.tags],
        },
      ],
    };

    return { ...az,
      modules: { ...az.modules,
        [file]: module_,
      },
    };
  }

  export function setModule(
    az: Analyzer,
    file: string,
    outcome: Outcome,
  ): [Module_, Analyzer] {
    if (outcome.t === 'exception') {
      az = addNote(az, Note(
        outcome.v.origin.p,
        'error',
        ['exception', ...outcome.v.tags],
        'Threw exception: ' + outcome.v.message,
      ));
    }

    const existing = az.modules[file];

    if (
      existing === undefined ||
      existing.loaded === false ||
      existing.outcome !== null
    ) {
      throw new Error('Shouldn\'t be possible');
    }

    const mod = { ...existing, outcome };

    az = { ...az,
      modules: { ...az.modules,
        [file]: mod,
      },
    };

    return [mod, az];
  }

  export function runFile(az: Analyzer, file: string): [Module_, Analyzer] {
    const moduleEntry = az.pack.modules[file];

    if (moduleEntry === undefined || moduleEntry.t === 'ParserNotes') {
      throw new Error('Shouldn\'t be possible');
    }

    let mod = az.modules[file];

    if (mod === undefined) {
      throw new Error('Shouldn\'t be possible');
    }

    if (mod.outcome !== null) {
      return [mod, az];
    }

    az = pushFile(az, file);

    let out: Outcome | analyze.TailCall;
    [out, az] = analyze.body(az, moduleEntry.program);

    while (typeof out === 'function') {
      [out, az] = out(az);
    }

    [mod, az] = setModule(az, file, out);

    [, az] = popFile(az);

    return [mod, az];
  }

  function retrieveImport(
    az: Analyzer,
    import_: Syntax.Import
  ): [Outcome, Analyzer] {
    const resolved = Package.resolveImport(import_.p[0], import_);

    if (typeof resolved !== 'string') {
      const ex = Outcome.Exception(
        import_,
        ['not-found'], // TODO: extra tag
        'Import not found: ' + resolved,
      );

      return [ex, az];
    }

    const entry = az.modules[resolved];

    if (entry === undefined) {
      if (resolved.split('/')[0] === '@') {
        throw new Error('Shouldn\'t be possible');
      }

      const ex = Outcome.Exception(
        import_,
        ['not-implemented'],
        'Not implemented: external packages',
      );

      return [ex, az];
    }

    // This case would be handled nicely by @below but typescript
    // has a limitation which necessitates handling it here
    if (entry.program === null) {
      if (entry.outcome === null) {
        // Related to the issue above, typescript really ought to know
        // this
        throw new Error('Shouldn\'t be possible');
      }

      return [entry.outcome, az];
    }

    // @below
    if (entry.outcome !== null) {
      return [entry.outcome, az];
    }

    const resolvedIndex = az.fileStack.indexOf(resolved);

    if (resolvedIndex !== -1) {
      let loop = [
        ...az.fileStack.slice(resolvedIndex + 1).reverse(),
        resolved,
        ...az.fileStack.slice(0, resolvedIndex).reverse(),
        resolved,
      ];

      function Dirname(f: string) {
        const parts = f.split('/');
        parts.pop();
        return parts.join('/') + '/';
      }

      function commonSubstr(a: string, b: string) {
        let res = '';

        for (let i = 0; i < a.length && i < b.length; i++) {
          if (a[i] !== b[i]) {
            break;
          }

          res += a[i];
        }

        return res;
      }

      const commonPrefix = loop.map(Dirname).reduce(commonSubstr);

      loop = loop.map(f => {
        let special = (f === resolved);

        f = f.slice(commonPrefix.length);

        if (special) {
          f = `[${f}]`;
        }

        return f;
      });

      let loopStr = loop.join(' -> ');

      if (commonPrefix !== '') {
        loopStr = `${commonPrefix}(${loopStr})`;
      }

      // TODO: Catch this in validation instead?
      az = Analyzer.addNote(az, Note(
        import_.p,
        'error',
        ['import-loop', 'infinite-loop'],
        'Import loop detected: ' + loopStr
      ));

      return [Outcome.Unknown(), az];
    }

    let entryMod: Analyzer.Module_;
    [entryMod, az] = Analyzer.runFile(az, resolved);

    if (entryMod.outcome === null) {
      throw new Error('Shouldn\'t be possible');
    }

    return [entryMod.outcome, az];
  }

  function ExpressionString(
    analyzer: Analyzer,
    exp: Syntax.Expression
  ): string {
    switch (exp.t) {
      case 'IDENTIFIER':
      case 'NUMBER':
      case 'STRING':
      case 'BOOL':
      case 'NULL':
      case '.':
      case 'functionCall':
      case 'methodLookup':
      case 'subscript':
      case 'func':
      case 'array':
      case 'object':
      case 'class':
      case 'switch':
      case 'import':
      case 'unary -':
      case 'unary +':
      case '--':
      case '++': {
        const [value] = analyze.subExpression(analyzer, exp);
        return Outcome.JsString(value);
      }

      default: {
        const [left, right] = exp.v;
        return [
          '(',
          ExpressionString(analyzer, left),
          ` ${exp.t} `,
          ExpressionString(analyzer, right),
          ')'
        ].join('');
      }
    }
  }

  export namespace analyze {
    export type TailCall = (az: Analyzer) => [TailCall | Outcome, Analyzer];

    export function body(
      az: Analyzer,
      program: Syntax.Program,
    ): [TailCall | Outcome, Analyzer] {
      let mout: Outcome | TailCall | null;
      [mout, az] = block(az, program);

      if (mout === null) {
        throw new Error('Shouldn\'t be possible');
      }

      return [mout, az];
    }

    export function block(
      az: Analyzer,
      program: Syntax.Program,
    ): [TailCall | Outcome | null, Analyzer] {
      const hoists: Syntax.FunctionExpression[] = [];
      const statements: Syntax.Statement[] = [];

      for (const statement of program.v) {
        if (statement.t === 'e' && statement.v.t === 'func') {
          hoists.push(statement.v);
        } else {
          statements.push(statement);
        }
      }

      for (const hoist of hoists) {
        if (hoist.v.name === null) {
          // Anonymous hoist is meaningless. Validation emits a warn about this.
          continue;
        }

        az = Analyzer.add(az, hoist.v.name.v, {
          origin: hoist,
          data: {
            cat: 'ref',
            t: 'func-ref',
            v: hoist,
          },
        });
      }

      let mout: TailCall | Outcome | null = null;

      for (const statement of statements) {
        [mout, az] = analyze.statement(az, statement);

        if (mout !== null) {
          break;
        }
      }

      return [mout, az];
    }

    export function statement(
      az: Analyzer,
      statement: Syntax.Statement,
    ): [Outcome | TailCall | null, Analyzer] {
      switch (statement.t) {
        case 'e': {
          return topExpression(az, statement.v);
        }

        case 'return': {
          return tailableSubExpression(az, statement.v);
        }

        case 'breakpoint': {
          debugger;
          return [null, az];
        }

        case 'assert': {
          let out: Outcome;
          [out, az] = subExpression(az, statement.v);

          if (out.t === 'exception') {
            return [out, az];
          }

          if (out.t === 'unknown') {
            // TODO!: maybeException handling, treat as unknown as error
            // sometimes
            return [null, az];
          }

          if (out.t !== 'bool') {
            az = Analyzer.addNote(az, Note(
              statement.v.p,
              'error',
              ['type-error', 'assert-non-bool'],
              `Type error: assert ${out.t}`,
            ));

            return [out, az];
          }

          if (out.v === false) {
            // TODO: Format code for other exceptions like this
            const ex = Outcome.Exception(statement.v,
              ['assert-false'],
              `Asserted ${ExpressionString(az, statement.v)}`,
            );

            return [ex, az];
          }

          return [null, az];
        }

        case 'if': {
          const [cond, block] = statement.v;
          let condOut: Outcome;
          [condOut, az] = subExpression(az, cond);

          if (condOut.t === 'exception') {
            return [condOut, az];
          }

          // TODO: unknown -> maybeException?

          if (condOut.t !== 'bool') {
            const ex = Outcome.Exception(cond,
              ['non-bool-condition', 'if-condition'],
              `Type error: Non-bool condition: ${condOut.t}`,
            );

            return [ex, az];
          }

          if (condOut.v === true) {
            az = Analyzer.push(az);
            let blockOut: Outcome | TailCall | null;
            [blockOut, az] = analyze.block(az, block);
            az = Analyzer.pop(az);

            if (blockOut !== null) {
              return [blockOut, az];
            }
          }

          return [null, az];
        }

        case 'for': {
          const { control, block } = statement.v;

          // TODO: Impure function - captures and contributes az mutations
          function cond(): Outcome.Bool | Outcome.Exception {
            if (
              control !== null &&
              control.t !== 'condition' &&
              control.t !== 'setup; condition; next'
            ) {
              const ex = Outcome.Exception(
                statement,
                ['not-implemented', 'for-control'],
                // TODO: Need to capture more structure in compiler notes
                `Not implemented: for loop with (${control.t}) control clause`,
              );

              return ex;
            }

            if (control === null) {
              return Outcome.Bool(true);
            }

            const condExp = (() => {
              switch (control.t) {
                case 'condition': return control.v;
                case 'setup; condition; next': return control.v[1];
              }
            })();

            let condOut: Outcome;
            [condOut, az] = subExpression(az, condExp);

            if (condOut.t !== 'bool') {
              const ex = Outcome.Exception(
                condExp,
                ['non-bool-condition', 'for-condition'],
                `Type error: Non-bool condition: ${condOut.t}`,
              );

              return ex;
            }

            return condOut;
          }

          az = Analyzer.push(az);

          if (control && control.t === 'setup; condition; next') {
            const [setup] = control.v;
            let setupEx: Outcome.Exception | null;
            [setupEx, az] = topExpression(az, setup);

            if (setupEx !== null) {
              return [setupEx, az];
            }
          }

          let iterations = 0;
          let mout: TailCall | Outcome | null = null;

          while (true) {
            const condOut = cond(); // mutates az

            if (condOut.t === 'exception') {
              return [condOut, az];
            }

            // TODO: Note counting, deduplication with if

            // TODO: unknown -> maybeException?

            if (condOut.v === false) {
              break;
            }

            az = Analyzer.push(az);
            [mout, az] = analyze.block(az, block);

            if (
              mout === null &&
              control &&
              control.t === 'setup; condition; next'
            ) {
              const [, , next] = control.v;
              [mout, az] = topExpression(az, next);
            }

            az = Analyzer.pop(az);

            iterations++;

            if (mout !== null) {
              break;
            }

            if (iterations >= 2048) {
              // TODO: Count total operations and limit execution based on that
              // instead.
              az = Analyzer.addNote(az, Note(
                statement.p,
                'warn',
                ['iteration-limit'],
                'Hit iteration limit of 2048',
              ));

              // Maybe exception?
              mout = Outcome.Unknown();
              break;
            }
          }

          az = Analyzer.pop(az);

          return [mout, az];
        }

        case 'import': {
          const [importIdentifier] = statement.v;

          az = Analyzer.add(az, importIdentifier.v, {
            origin: importIdentifier,
            data: {
              cat: 'ref',
              t: 'import-ref',
              v: statement,
            },
          });

          return [null, az];
        }

        case 'break':
        case 'continue': {
          const ex = Outcome.Exception(
            statement,
            // TODO: Need to capture more structure in compiler notes
            ['not-implemented'],
            `Not implemented: ${statement.t} statement`,
          );

          return [ex, az];
        }
      }
    }

    export function topExpression(
      az: Analyzer,
      exp: Syntax.Expression,
    ): [Outcome.Exception | null, Analyzer] {
      let mex: Outcome.Exception | null = null;

      checkNull((() => {
        switch (exp.t) {
          // TODO: Support more compound assignment operators
          case ':=':
          case '=':
          case '+=':
          case '-=':
          case '*=':
          case '/=':
          case '%=':
          case '<<=':
          case '>>=':
          case '&=':
          case '^=':
          case '|=': {
            const leftExp = exp.v[0];

            const rightExp: Syntax.Expression = (() => {
              // The need for the type annotation below is a particularly strange
              // quirk of typescript - without it, synthOp is a string when
              // included in the return object even though it correctly deduces the
              // more accurate type when hovering on synthOp.
              const synthOp: Syntax.NonSpecialBinaryOperator | null = (() => {
                switch (exp.t) {
                  case ':=': return null;
                  case '=': return null;
                  case '+=': return '+';
                  case '-=': return '-';
                  case '*=': return '*';
                  case '/=': return '/';
                  case '%=': return '%';
                  case '<<=': return '<<';
                  case '>>=': return '>>';
                  case '&=': return '&';
                  case '^=': return '^';
                  case '|=': return '|';
                }
              })();

              if (synthOp === null) {
                return exp.v[1];
              }

              return {
                t: synthOp,
                v: exp.v,
                p: exp.p,
              };
            })();

            let right: Outcome;
            [right, az] = subExpression(az, rightExp);

            if (right.t === 'exception') {
              mex = right;
              return null;
            }

            [mex, az] = createOrAssign(
              az,
              exp,
              leftExp,
              exp.t === ':=' ? ':=' : '=',
              right,
            );

            return null;
          }

          case '--':
          case '++': {
            const subExp = exp.v;

            let out: Outcome;
            [out, az] = subExpression(az, subExp);

            if (out.t === 'exception') {
              mex = out;
              return null;
            }

            if (out.t !== 'number') {
              mex = Outcome.Exception(
                subExp,
                ['type-error', 'inc-dec'],
                `Type error: ${out.t}${exp.t}`,
              );

              return null;
            }

            if (subExp.t !== 'IDENTIFIER') {
              mex = Outcome.Exception(
                exp,
                ['not-implemented', 'non-identifier-assignment-target'],
                `Not implemented: non-identifier lvalues`,
              );

              return null;
            }

            const newValue = {
              t: 'number' as 'number',
              v: out.v + (exp.t === '++' ? 1 : -1)
            };

            az = Analyzer.set(az, subExp.v, newValue);

            return null;
          }

          case 'func': {
            const func = Outcome.FuncPlain({ exp, az });

            if (!exp.topExp) {
              // TODO: Enforce this by typing?
              throw new Error('Shouldn\'t be possible');
            }

            if (exp.v.name) {
              az = Analyzer.add(az, exp.v.name.v, {
                origin: exp,
                data: func,
              });
            }

            return null;
          }

          case 'class': {
            mex = Outcome.Exception(
              exp,
              ['not-implemented'],
              `Not implemented: ${exp.t} expression`,
            );

            return null;
          }

          case 'NUMBER':
          case 'BOOL':
          case 'NULL':
          case 'STRING':
          case 'IDENTIFIER':
          case '--':
          case '++':
          case '+':
          case '*':
          case '-':
          case '<<':
          case '>>':
          case '&':
          case '^':
          case '|':
          case '/':
          case '%':
          case '**':
          case '&&':
          case '||':
          case '==':
          case '!=':
          case '<':
          case '>':
          case '<=':
          case '>=':
          case 'unary -':
          case 'unary +':
          case 'array':
          case 'object':

          // Well, this is a top expression but it's processed as a statement, does
          // it really belong here? Something is up TODO.
          case 'import':

          case 'switch':
          case 'func':
          case 'class':
          case 'subscript':
          case 'functionCall':
          case 'methodLookup':
          case '.': {
            throw new Error(
              'Non-top expression at top level should have been caught ' +
              'during validation.'
            );
          }
        }
      })());

      return [mex, az];
    }

    export function createOrAssign(
      az: Analyzer,
      exp: Syntax.Expression,
      leftExp: Syntax.Expression,
      op: '=' | ':=',
      right: Outcome.Value,
    ): [Outcome.Exception | null, Analyzer] {
      let mex: Outcome.Exception | null = null;

      if (leftExp.t === 'array' || leftExp.t === 'object') {
        // TODO: Fail earlier / in a more informative way when attempting a
        // destructuring and compound assignment simultaneously?

        // TODO: Unknown should also work
        if (right.t !== leftExp.t) {
          mex = Outcome.Exception(exp,
            ['type-error', 'destructuring-mismatch'],
            // TODO: a vs an
            `Assignment target is an ${leftExp.t} but the value is a ` +
            right.t
          );

          return [mex, az];
        }

        if (right.cat !== 'concrete') {
          mex = Outcome.Exception(exp,
            ['type-error', 'destructuring-mismatch'],
            // TODO: This is wrong / implement proper unknown handling here
            'Assignment target is an array but the value is unknown',
          );

          return [mex, az];
        }

        const numRightValues = (
          right.t === 'array' ?
          right.v.length :
          Object.keys(right.v).length
        );

        if (leftExp.v.length !== numRightValues) {
          // TODO: Implement _ as special ignore identifier
          // TODO: Customize message for object destructuring?
          mex = Outcome.Exception(
            exp,
            ['type-error', 'destructuring-mismatch', 'length-mismatch'],
            [
              'Destructuring length mismatch: ',
              leftExp.v.length,
              ' targets but only ',
              numRightValues,
              ' values',
            ].join(''),
          );

          return [mex, az];
        }

        for (let i = 0; i < leftExp.v.length; i++) {
          const { key, target } = (() => {
            if (leftExp.t === 'object') {
              const [{ v: key }, target] = leftExp.v[i];
              return { key, target };
            }

            return { key: null, target: leftExp.v[i] };
          })();

          if (key !== null && !(key in right.v)) {
            mex = Outcome.Exception(
              exp,
              ['type-error', 'destructuring-mismatch', 'key-not-found'],
              `Key ${key} from object destructuring expression not found ` +
              'in the object on the right',
            );

            return [mex, az];
          }

          const subRight = right.v[key !== null ? key : i];

          [mex, az] = createOrAssign(
            az,
            exp,
            target,
            op,
            subRight,
          );

          if (mex !== null) {
            return [mex, az];
          }
        }

        return [mex, az];
      }

      let leftBaseExp: Syntax.Expression = leftExp;
      const accessChain: (string | number)[] = [];

      while (true) {
        if (leftBaseExp.t === 'IDENTIFIER') {
          break;
        }

        if (leftBaseExp.t === '.') {
          const [newBase, identifier]: [
            // Not quite sure why typescript needs this annotation
            Syntax.Expression,
            Syntax.Identifier // Typescript disallows trailing comma?
          ] = leftBaseExp.v;

          leftBaseExp = newBase;
          accessChain.unshift(identifier.v);

          continue;
        }

        if (leftBaseExp.t === 'subscript') {
          const [newBase, accessor]: [
            // Not quite sure why typescript needs this annotation
            Syntax.Expression,
            Syntax.Expression // Typescript disallows trailing comma?
          ] = leftBaseExp.v;

          let acc: Outcome;
          [acc, az] = subExpression(az, accessor);

          if (acc.t === 'exception') {
            return [acc, az];
          }

          if (
            acc.t !== 'string' &&
            acc.t !== 'number'
          ) {
            mex = Outcome.Exception(accessor,
              ['type-error', 'subscript'],
              `Type error: ${acc.t} subscript`,
            );

            return [mex, az];
          }

          leftBaseExp = newBase;
          accessChain.unshift(acc.v);

          continue;
        }

        mex = Outcome.Exception(leftBaseExp,
          ['invalid-assignment-target', 'destructuring'],
          // TODO: Don't analyze if failed validation and throw internal
          // error here instead
          `(redundant) Invalid assignment target: ${leftBaseExp.t} ` +
          'expression',
        );

        return [mex, az];
      }

      if (accessChain.length === 0 && op === ':=') {
        az = Analyzer.add(
          az,

          // leftExp would also work, but typescript doesn't know
          leftBaseExp.v,

          {
            origin: leftExp,
            data: right,
          },
        );

        return [null, az];
      }

      let existing: Analyzer.ScopeValueEntry | null;
      [existing, az] = Analyzer.get(az, leftBaseExp.v);

      if (existing === null) {
        throw new Error('Shouldn\'t be possible');
      }

      function modifyChain(
        oldValue: Outcome.Value,
        chain: (string | number)[],
        newValue: Outcome.Value,
      ): Outcome {
        const [index, ...newChain] = chain;

        if (index === undefined) {
          return newValue;
        }

        if (oldValue.t === 'object' && typeof index === 'string') {
          // TODO: Improve typing so that typescript knows this can be
          // undefined instead of using its permissive (incorrect) analysis
          // of index typing.
          const oldSubValue = oldValue.v[index];

          if (oldSubValue === undefined && op !== ':=') {
            return Outcome.Exception(leftExp,
              ['key-not-found'],
              // TODO: Better message, location
              'Key not found',
            );
          }

          if (oldSubValue !== undefined && op === ':=') {
            return Outcome.Exception(leftExp,
              ['duplicate', 'duplicate-key'],
              `Trying to add key ${index} that already exists`,
            );
          }

          const newValueAtIndex = modifyChain(
            oldValue.v[index],
            newChain,
            newValue,
          );

          if (newValueAtIndex.cat === 'invalid') {
            return newValueAtIndex;
          }

          if (
            oldValue.cat === 'concrete' &&
            newValueAtIndex.cat === 'concrete'
          ) {
            return Outcome.ConcreteObject({
              ...oldValue.v,
              [index]: newValueAtIndex
            });
          }

          return Outcome.Object({
            ...oldValue.v,
            [index]: newValueAtIndex,
          });
        }

        if (oldValue.t === 'array' && typeof index === 'number') {
          if (
            index !== Math.floor(index) ||
            index < 0
          ) {
            // TODO: More accurate expression reference (just providing
            // entire lhs instead of specifically the bad subscript/.)
            return Outcome.Exception(leftExp,
              ['out-of-bounds', 'index-bad'],
              `Invalid index: ${index}`,
            );
          }

          if (index >= oldValue.v.length) {
            // TODO: More accurate expression reference (just providing
            // entire lhs instead of specifically the bad subscript/.)
            return Outcome.Exception(
              leftExp,
              ['out-of-bounds', 'index-too-large'],
              [
                'Out of bounds: index ',
                index,
                ' but array is only length ',
                oldValue.v.length
              ].join('')
            );
          }

          if (newChain.length === 0 && op === ':=') {
            return Outcome.Exception(
              leftExp,
              ['duplicate', 'duplicate-index'],
              `Attempt to add duplicate index ${index} to array (the ` +
              'creation operator := never works with an array subscript ' +
              'on the left)',
            );
          }

          const newValueAtIndex = modifyChain(
            oldValue.v[index],
            newChain,
            newValue,
          );

          if (newValueAtIndex.cat === 'invalid') {
            return newValueAtIndex;
          }

          if (
            oldValue.cat === 'concrete' &&
            newValueAtIndex.cat === 'concrete'
          ) {
            return Outcome.ConcreteArray([
              ...oldValue.v.slice(0, index),
              newValueAtIndex,
              ...oldValue.v.slice(index + 1),
            ]);
          }

          return Outcome.Array([
            ...oldValue.v.slice(0, index),
            newValueAtIndex,
            ...oldValue.v.slice(index + 1),
          ]);
        }

        // TODO: More accurate expression reference (just providing entire
        // lhs instead of specifically the bad subscript/.)
        return Outcome.Exception(leftExp,
          ['type-error', 'index-bad'],
          `Type error: attempt to index ${oldValue.t} with a ` +
          typeof index,
        );
      }

      const newBaseValue = modifyChain(
        existing.data,
        accessChain,
        right,
      );

      if (newBaseValue.t === 'exception') {
        mex = newBaseValue;
        return [mex, az];
      }

      az = Analyzer.set(
        az,
        leftBaseExp.v,
        newBaseValue,
      );

      return [null, az];
    }

    export function subExpression(
      az: Analyzer,
      exp: Syntax.Expression
    ): [Outcome, Analyzer] {
      switch (exp.t) {
        case 'NUMBER': { return [Outcome.Number(Number(exp.v)), az]; }
        case 'BOOL': { return [Outcome.Bool(exp.v), az]; }
        case 'NULL': { return [Outcome.Null(), az]; }

        case 'STRING': {
          const str = Outcome.String(Outcome.String.unescape(
            exp.v.substring(1, exp.v.length - 1)
          ));

          return [str, az];
        }

        case 'IDENTIFIER': {
          let entry: Analyzer.ScopeValueEntry | null;
          [entry, az] = Analyzer.get(az, exp.v);

          if (entry === null) {
            const ex = Outcome.Exception(
              exp,
              ['not-found'],
              `Variable does not exist: ${exp.v}`
            );

            return [ex, az];
          }

          return [entry.data, az];
        }

        case '+': {
          return vanillaOperator(
            az,
            exp,
            (left, right) => {
              if (left.t === 'number' && right.t === 'number') {
                return Outcome.Number(left.v + right.v);
              }

              if (left.t === 'string' && right.t === 'string') {
                return Outcome.String(left.v + right.v);
              }

              if (left.t === 'array' && right.t === 'array') {
                if (left.cat === 'concrete' && right.cat === 'concrete') {
                  return Outcome.ConcreteArray([...left.v, ...right.v]);
                }

                return Outcome.Array([...left.v, ...right.v]);
              }

              if (left.t === 'object' && right.t === 'object') {
                const leftKeys: { [key: string]: true | undefined } = {};

                for (const key of Object.keys(left.v)) {
                  leftKeys[key] = true;
                }

                for (const key of Object.keys(right.v)) {
                  if (leftKeys[key]) {
                    return Outcome.Exception(exp,
                      [
                        'duplicate',
                        'duplicate-key',
                        'object-addition',
                      ],
                      'Type error: objects cannot be added due to duplicate ' +
                      'key ' + key,
                    );
                  }
                }

                if (left.cat === 'concrete' && right.cat === 'concrete') {
                  return Outcome.ConcreteObject({ ...left.v, ...right.v });
                }

                return Outcome.Object({ ...left.v, ...right.v });
              }

              const forbiddenTypes: Outcome.Value['t'][] = [
                'bool',
                'null',
                'func', // TODO: define function addition when appropriate
              ];

              if (
                forbiddenTypes.indexOf(left.t) !== -1 ||
                forbiddenTypes.indexOf(right.t) !== -1
              ) {
                return null;
              }

              if (left.t === 'unknown' || right.t === 'unknown') {
                return Outcome.Unknown();
              }

              return null;
            },
          );
        }

        case '*': {
          return vanillaOperator(
            az,
            exp,
            (left, right) => {
              if (left.t === 'number' && right.t === 'number') {
                return Outcome.Number(left.v * right.v);
              }

              const str = (
                left.t === 'string' ? left :
                right.t === 'string' ? right :
                null
              );

              const arr = (
                left.t === 'array' ? left :
                right.t === 'array' ? right :
                null
              );

              const num = (
                left.t === 'number' ? left :
                right.t === 'number' ? right :
                null
              );

              const obj = (
                left.t === 'object' ? left :
                right.t === 'object' ? right :
                null
              );

              // TODO: Implement generic version of this which just requires
              // non-number type to have a + operator
              // TODO: Possibly configure limit for this behaviour during
              // analysis?
              if (str && num) {
                return Outcome.String.multiply(str, num);
              }

              if (arr && num) {
                return Outcome.Array.multiply(arr, num);
              }

              if (obj && num) {
                return Outcome.Object.multiply(exp, obj, num);
              }

              const forbiddenTypes: Outcome.Value['t'][] = [
                'bool',
                'null',
                'func', // TODO: define function multiplication when appropriate
              ];

              if (
                forbiddenTypes.indexOf(left.t) !== -1 ||
                forbiddenTypes.indexOf(right.t) !== -1
              ) {
                return null;
              }

              if (left.t === 'unknown' || right.t === 'unknown') {
                return Outcome.Unknown();
              }

              return null;
            },
          );
        }

        // Number only operators (for now)
        case '-':
        case '<<':
        case '>>':
        case '&':
        case '^':
        case '|':
        case '/':
        case '%':
        case '**': {
          const op: (a: number, b: number) => number = (() => {
            switch (exp.t) {
              case '-': return (a: number, b: number) => a - b;
              case '<<': return (a: number, b: number) => a << b;
              case '>>': return (a: number, b: number) => a >> b;
              case '&': return (a: number, b: number) => a & b;
              case '^': return (a: number, b: number) => a ^ b;
              case '|': return (a: number, b: number) => a | b;
              case '/': return (a: number, b: number) => a / b;
              case '%': return (a: number, b: number) => a % b;
              case '**': return (a: number, b: number) => a ** b;
            }
          })();

          return vanillaOperator(
            az,
            exp,
            (left, right) => {
              if (left.t === 'number' && right.t === 'number') {
                return Outcome.Number(op(left.v, right.v));
              }

              if (
                (left.t === 'unknown' || right.t === 'unknown') &&
                (left.t === 'number' || right.t === 'number')
              ) {
                return Outcome.Unknown();
              }

              return null;
            },
          );
        }

        case '&&':
        case '||': {
          const op: (a: boolean, b: boolean) => boolean = (() => {
            switch (exp.t) {
              case '&&': return (a: boolean, b: boolean) => a && b;
              case '||': return (a: boolean, b: boolean) => a || b;
            }
          })();

          return vanillaOperator(
            az,
            exp,
            (left, right) => {
              if (left.t === 'bool' && right.t === 'bool') {
                return Outcome.Bool(op(left.v, right.v));
              }

              if (
                (left.t === 'unknown' || right.t === 'unknown') &&
                (left.t === 'bool' || right.t === 'bool')
              ) {
                return Outcome.Unknown();
              }

              return null;
            },
          );
        }

        case '==':
        case '!=':
        case '<':
        case '>':
        case '<=':
        case '>=': {
          const op = exp.t;

          return vanillaOperator(
            az,
            exp,
            (left, right) => {
              if (left.t === 'unknown' || right.t === 'unknown') {
                return Outcome.Unknown();
              }

              if (left.cat === 'valid' || right.cat === 'valid') {
                // (This case is for objects & arrays that have unknowns)
                // TODO: Should be possible to sometimes (often?) determine
                // ordering without concrete array/object.
                return Outcome.Unknown();
              }

              return Outcome.TypedComparison(exp, op, left, right)
            },
          );
        }

        case 'unary -':
        case 'unary +': {
          let right: Outcome;
          [right, az] = subExpression(az, exp.v);

          if (right.t === 'exception' || right.t === 'unknown') {
            return [right, az];
          }

          if (right.t !== 'number') {
            const ex = Outcome.Exception(
              exp,
              ['type-error', 'unary-plus-minus'],
              `Type error: ${exp.t.slice(6)}${right.t}`,
            );

            return [ex, az];
          }

          const out = Outcome.Number(right.v * (exp.t === 'unary -' ? -1 : 1));
          return [out, az];
        }

        case 'func': {
          return [Outcome.FuncPlain({ exp, az }), az];
        }

        case 'functionCall': {
          let tout: Outcome | TailCall;
          [tout, az] = functionCall(az, exp);

          while (typeof tout === 'function') {
            [tout, az] = tout(az);
          }

          return [tout, az];
        }

        case 'array': {
          const res = Outcome.ValidArray([]);
          let arrConcrete = true;

          for (const elExp of exp.v) {
            let el: Outcome;
            [el, az] = subExpression(az, elExp);

            if (el.t === 'exception') {
              return [el, az];
            }

            if (el.cat !== 'concrete') {
              arrConcrete = false;
            }

            res.v.push(el);
          }

          if (arrConcrete) {
            // TODO: Breaking the type system here, but this should work. What
            // to do here?
            (res as any).cat = 'concrete';
          }

          return [res, az];
        }

        case 'subscript': {
          const [containerExp, indexExp] = exp.v;

          let container: Outcome;
          [container, az] = subExpression(az, containerExp);

          if (container.t === 'exception') {
            return [container, az];
          }

          let index: Outcome;
          [index, az] = subExpression(az, indexExp);

          if (index.t === 'exception') {
            return [index, az];
          }

          if (container.t === 'array') {
            if (index.t !== 'number') {
              const ex = Outcome.Exception(exp,
                ['type-error', 'subscript'],
                `Type error: ${container.t}[${index.t}]`,
              );

              return [ex, az];
            }

            if (index.v < 0 || index.v !== Math.floor(index.v)) {
              const ex = Outcome.Exception(indexExp,
                ['subscript', 'out-of-bounds', 'index-bad'],
                `Invalid array index: ${index.v}`,
              );

              return [ex, az];
            }

            if (index.v >= container.v.length) {
              const ex = Outcome.Exception(
                exp,
                ['out-of-bounds', 'index-too-large'],
                [
                  'Out of bounds: index ',
                  index.v,
                  ' but array is only length ',
                  container.v.length
                ].join(''),
              );

              return [ex, az];
            }

            const out = container.v[index.v];
            return [out, az];
          }

          if (container.t === 'object') {
            const out = Outcome.Object.subscript(exp, container, index);
            return [out, az];
          }

          const ex = Outcome.Exception(exp,
            ['type-error', 'subscript', 'object'],
            `Type error: ${container.t}[${index.t}]`,
          );

          return [ex, az];
        }

        case 'object': {
          const res = Outcome.Object({});
          let objConcrete = true;

          for (const [identifierKey, subExp] of exp.v) {
            let sub: Outcome;
            [sub, az] = subExpression(az, subExp);

            if (sub.t === 'exception') {
              return [sub, az];
            }

            if (sub.cat !== 'concrete') {
              objConcrete = false;
            }

            res.v[identifierKey.v] = sub;
          }

          if (objConcrete) {
            res.cat = 'concrete';
          }

          return [res, az];
        }

        case '.': {
          const [objExp, keyExp] = exp.v;

          let obj: Outcome;
          [obj, az] = subExpression(az, objExp);

          if (obj.t === 'exception') {
            return [obj, az];
          }

          const out = Outcome.Object.subscript(exp, obj, Outcome.String(keyExp.v));
          return [out, az];
        }

        case 'switch': {
          const [testExp, cases] = exp.v;

          let testValue: Outcome.Concrete | null = null;

          if (testExp !== null) {
            let testOut: Outcome;
            [testOut, az] = subExpression(az, testExp);

            if (testOut.t === 'exception') {
              return [testOut, az];
            }

            if (testOut.cat !== 'concrete') {
              // TODO: Bailing with unknown here because comparison can't yet
              // handle non-concrete values
              return [Outcome.Unknown(), az];
            }

            testValue = testOut;
          }

          for (const [labelExp, resultExp] of cases) {
            let label: Outcome;
            [label, az] = subExpression(az, labelExp);

            if (label.t === 'exception' || label.t === 'unknown') {
              return [label, az];
            }

            let combinedLabelValue: Outcome = label;

            if (testValue !== null) {
              if (label.cat !== 'concrete') {
                // TODO: Bailing with unknown here because comparison can't yet
                // handle non-concrete values
                return [Outcome.Unknown(), az];
              }

              if (!Outcome.SameType(testValue, label)) {
                continue;
              }

              combinedLabelValue = Outcome.TypedEqual(
                labelExp,
                testValue,
                label
              );

              if (combinedLabelValue.t === 'exception') {
                // TODO: If it somehow did generate an exception, labelExp was
                // the wrong reference expression to pass into TypedEqual. Need
                // a better solution here.
                throw new Error('Shouldn\'t be possible to get here');
              }
            }

            if (combinedLabelValue.t !== 'bool') {
              if (testValue !== null) {
                // If the test value is present, it shouldn't be possible to get
                // a non-bool here. This check is here because the diagnostic
                // generated below assumes the switch lacks a test value.
                throw new Error('Shouldn\'t be possible');
              }

              const ex = Outcome.Exception(
                labelExp,
                ['type-error', 'non-bool-switch-case'],
                `Switch case was type {${label.t}} instead of {bool}`,
              );

              return [ex, az];
            }

            if (combinedLabelValue.v === true) {
              return subExpression(az, resultExp);
            }
          }

          // TODO: Often the analyzer should be producing error notes and
          // continuing with an unknown instead of an exception. This is
          // definitely one of those cases.
          const ex = Outcome.Exception(
            exp,
            ['incomplete-switch'],
            'Switch did not handle every possibility',
          );

          return [ex, az];
        }

        case 'import': {
          return retrieveImport(az, exp);
        }

        case 'methodLookup': {
          const [baseExp, methodIdentifier] = exp.v;

          let base: Outcome;
          [base, az] = subExpression(az, baseExp);

          if (base.t === 'exception' || base.t === 'unknown') {
            return [base, az];
          }

          const func = Outcome.lookupMethod(base, methodIdentifier.v);

          if (func === null) {
            const ex = Outcome.Exception(
              exp,
              ['not-found'], // TODO extra tag(s)
              `Method not found: ${base.t}:${methodIdentifier.v}`,
            );

            return [ex, az];
          }

          return [func, az];
        }

        case 'class': {
          const ex = Outcome.Exception(
            exp,
            ['not-implemented'],
            `Not implemented: ${exp.t} expression`,
          );

          return [ex, az];
        }

        case ':=':
        case '=':
        case '+=':
        case '-=':
        case '*=':
        case '/=':
        case '%=':
        case '<<=':
        case '>>=':
        case '&=':
        case '^=':
        case '|=':
        case '++':
        case '--': {
          throw new Error(
            'Mutation operator in subexpression should have been caught ' +
            'during validation.'
          );
        }
      }
    }

    export function tailableSubExpression(
      az: Analyzer,
      exp: Syntax.Expression
    ): [TailCall | Outcome, Analyzer] {
      if (exp.t === 'functionCall') {
        return functionCall(az, exp);
      }

      return subExpression(az, exp);
    }

    export function functionCall(
      az: Analyzer,
      exp: Syntax.FunctionCall,
    ): [Outcome | TailCall, Analyzer] {
      const [funcExp, argExps] = exp.v;

      let func: Outcome;
      [func, az] = subExpression(az, funcExp);

      func = (() => {
        switch (func.t) {
          case 'func': {
            return func;
          }

          case 'unknown':
          case 'exception': {
            return func;
          }

          case 'string':
          case 'number':
          case 'bool':
          case 'null':
          case 'array':
          case 'object': {
            return Outcome.Exception(funcExp,
              ['type-error', 'call-non-function'],
              `Type error: attempt to call a ${func.t} as a function`
            );
          }
        }
      })();

      if (func.t === 'exception') {
        return [func, az];
      }

      const args: ScopeValueEntry[] = [];

      for (const argExp of argExps) {
        let arg: Outcome;
        [arg, az] = subExpression(az, argExp);

        if (arg.t === 'exception') {
          return [arg, az];
        }

        args.push({
          origin: argExp,
          data: arg,
        });
      }

      let out: TailCall | Outcome | null = null;

      checkNull((() => {
        switch (func.t) {
          case 'unknown': {
            // TODO: maybeException?
            out = Outcome.Unknown();
            return null;
          }

          case 'func': {
            const funcArgLength = Outcome.Func.ArgLength(func);
            if (funcArgLength !== args.length) {
              const ex = Outcome.Exception(
                exp,
                ['type-error', 'arguments-length-mismatch'],
                [
                  'Arguments length mismatch: ',
                  Outcome.JsString(func),
                  ' requires ',
                  funcArgLength,
                  ' arguments but ',
                  args.length,
                  ' were provided'
                ].join(''),
              );

              out = ex;
              return null;
            }

            out = TailCall(funcExp, func, args);

            return null;
          }
        }
      })());

      if (out === null) {
        throw new Error('Shouldn\'t be possible');
      }

      return [out, az];
    }

    export function TailCall(
      funcExp: Syntax.Expression,
      func: Outcome.Func,
      argEntries: ScopeValueEntry[],
    ): TailCall | Outcome.Exception {
      // This is here because typescript forgets the narrowed type of func
      // inside the lambdas below.
      const funcv = func.v;

      if (funcv.t === 'method') {
        return (az: Analyzer) => {
          const impl = Outcome.methodImpls[funcv.v.base.t][funcv.v.name];

          const out = impl(
            funcv.v.base,
            // TODO: Should be getting this from argEntries but the
            // special case of zero arguments works fine like this
            [],
          );

          return [out, az];
        };

        return Outcome.Exception(
          funcExp,
          ['not-implemented'],
          'Not implemented ' + Outcome.JsString(func),
        );
      }

      return (az: Analyzer) => {
        let funcAz = { ...funcv.v.az,
          modules: az.modules,
          // TODO: Not doing this should break in an interesting way
          // fileStack: az.fileStack,
        };

        if (funcv.v.exp.v.name !== null) {
          funcAz = Analyzer.add(
            funcAz,
            funcv.v.exp.v.name.v,
            {
              origin: funcv.v.exp,
              data: func,
            },
          );
        }

        for (let i = 0; i < argEntries.length; i++) {
          // TODO: Argument destructuring
          const argEntry = argEntries[i];
          const [argIdentifier] = funcv.v.exp.v.args[i].v;

          funcAz = Analyzer.add(
            funcAz,
            argIdentifier.v,
            argEntry,
          );
        }

        const body = funcv.v.exp.v.body;

        // TODO: Do some processing with the notes so that they have
        // subnotes for stack levels.

        if (body.t === 'expBody') {
          let nextOut: TailCall | Outcome;
          [nextOut, funcAz] = tailableSubExpression(funcAz, body.v);
          az = { ...az, modules: funcAz.modules };
          return [nextOut, az];
        }

        let nextOut: TailCall | Outcome;
        [nextOut, funcAz] = analyze.body(funcAz, body);
        az = { ...az, modules: funcAz.modules };
        return [nextOut, az];
      };
    }

    export function vanillaOperator<T extends {
      t: Syntax.NonSpecialBinaryOperator,
      v: [Syntax.Expression, Syntax.Expression],
      p: Syntax.Pos
    }>(
      az: Analyzer,
      exp: T,
      combine: (a: Outcome.Value, b: Outcome.Value) => Outcome | null,
    ): [Outcome, Analyzer] {
      let left: Outcome;
      [left, az] = subExpression(az, exp.v[0]);

      if (left.t === 'exception') {
        return [left, az];
      }

      let right: Outcome;
      [right, az] = subExpression(az, exp.v[1]);

      if (right.t === 'exception') {
        return [right, az];
      }

      let value = combine(left, right);

      if (value === null) {
        // TODO: Combine should return something more informative than null to
        // indicate that a type error should result.
        value = Outcome.Exception(
          exp,
          ['type-error', 'operator'],
          `Type error: ${left.t} ${exp.t} ${right.t}`,
        );
      }

      return [value, az];
    }
  }
}

export default Analyzer;
