import checkNull from './checkNull';
import formatLocation from './formatLocation';
import identifiersEqual from './identifiersEqual';
import Note from './Note';
import Scope from './Scope';
import Syntax from './parser/Syntax';
import traverse from './traverse';

type Closure = {
  identifier: Syntax.Identifier;
  origin: Syntax.Identifier;
}[];

type VInfo = {
  origin: Syntax.Identifier;
  data: {
    uses: Syntax.Identifier[];
    mutations: null | Syntax.Identifier[];
    captures: Syntax.Identifier[];
    hoistInfo: null | {
      uses: {
        origin: Syntax.Identifier;
        scope: Scope<ST>;
      }[];
      closure: null | Closure;
    };
  };
};

type ST = {
  root: {};
  entry: VInfo;
};

type Push = { t: 'Push' };
const push: Push = { t: 'Push' };

type Pop = { t: 'Pop' };
const pop: Pop = { t: 'Pop' };

type CreateVariable = {
  t: 'CreateVariable',
  v: (
    Syntax.Identifier |
    Syntax.FunctionExpression |
    Syntax.ClassExpression |
    never
  ),
};

type CreateFunction = CreateVariable & { v: Syntax.FunctionExpression };

type IdentifierMutationTarget = {
  t: 'IDENTIFIER-mutationTarget',
  v: string,
  p: Syntax.Pos,
};

type ScopeItem = (
  Syntax.Element |
  Push |
  Pop |
  CreateVariable |
  IdentifierMutationTarget |
  never
);

export default function CapturedNames(
  outerScope: Scope<ST>,
  func: Syntax.FunctionExpression,
): {
  notes: Note[];
  closure: Closure;
  scope: Scope<ST>,
} {
  const notes: Note[] = [];
  let scope: Scope<ST> | Scope.Root<ST> = Scope.push<ST>(outerScope);
  const closure: Closure = [];

  const items: ScopeItem[] = [];

  if (!func.topExp && func.v.name) {
    items.push({
      t: 'CreateVariable',
      v: func,
    });
  }

  for (const arg of func.v.args) {
    function DestructuredArguments(
      target: Syntax.Expression
    ): CreateVariable[] {
      if (target.t === 'Object') {
        return concat(target.v.map(([, exp]) => DestructuredArguments(exp)));
      }

      if (target.t === 'Array') {
        return concat(target.v.map(DestructuredArguments));
      }

      if (target.t === 'IDENTIFIER') {
        return [{
          t: 'CreateVariable' as 'CreateVariable',
          v: target,
        }];
      }

      // TODO: Emit errors for invalid argument
      return [];
    }

    items.push(...DestructuredArguments(arg.v));
  }

  items.push(...traverse<ScopeItem, ScopeItem>(
    func.v.body.t === 'block' ? func.v.body : func.v.body.v,
    el => [el],
    el => {
      switch (el.t) {
        case 'Func':
        case 'Push':
        case 'Pop':
        case 'CreateVariable':
        case 'IDENTIFIER-mutationTarget': {
          return [];
        }

        case 'class': {
          return [{ t: 'CreateVariable', v: el.v.name }];
        }

        case 'block': {
          const children: ScopeItem[] = Syntax.Children(el);
          const hoists: CreateFunction[] = [];

          for (const child of children) {
            if (child.t === 'e' && child.v.t === 'Func' && child.v.v.name) {
              hoists.push({
                t: 'CreateVariable',
                v: child.v,
              });
            }
          }

          return [push, ...hoists, ...children, pop];
        }

        case 'for': {
          if (el.v.control && el.v.control.t === 'range') {
            const [target, container] = el.v.control.v;

            const [file, [start, ]] = target.p;
            const [, [, end]] = container.p;

            const synthExp: Syntax.Expression = {
              // TODO: This is a bit of a hack. Syntactically, the := is not
              // there so there is risk of surfacing a confusing error and
              // container is not exactly the rhs either.
              t: ':=',
              v: [target, container],
              topExp: true,
              p: [file, [start, end]] as Syntax.Pos,
            };

            return [
              push,
              synthExp,
              el.v.block,
              pop,
            ];
          }

          return [push, ...Syntax.Children(el), pop];
        }

        case ':=': {
          const [left, right] = el.v;

          const targets: Syntax.Expression[] = (
            traverse<Syntax.Expression, Syntax.Expression>(
              left,
              el => (
                el.t === 'Array' ? [] :
                el.t === 'Object' ? [] :
                [el]
              ),
              el => (
                el.t === 'Array' ? el.v :
                el.t === 'Object' ? el.v.map(([k, v]) => v) :
                []
              ),
            )
          );

          const children: ScopeItem[] = [right];

          for (const target of targets) {
            if (target.t === 'IDENTIFIER') {
              children.push({ t: 'CreateVariable', v: target });
            } else {
              children.push(target);
            }
          }

          return children;
        }

        case 'import': {
          if (!el.topExp) {
            return [];
          }

          const [identifier] = el.v;
          return [{ t: 'CreateVariable', v: identifier }];
        }

        case 'methodLookup': {
          const [base] = el.v;
          return [base];
        }

        default: {
          let mutationTarget: Syntax.Element | null = null;

          if (Syntax.isAssignmentOperator(el.t)) {
            // TODO: any usage below... needed because typescript can't
            // figure this situation out I think
            mutationTarget = (el as any).v[0];
          } else if (el.t === 'unary ++' || el.t === 'unary --') {
            mutationTarget = el.v;
          }

          if (mutationTarget !== null) {
            function TargetBases(
              target: Syntax.Element
            ): IdentifierMutationTarget[] {
              while (
                target.t === '.' ||
                target.t === 'subscript'
              ) {
                target = target.v[0];
              }

              if (target.t === 'Object') {
                return concat(target.v.map(([, exp]) => TargetBases(exp)));
              }

              if (target.t === 'Array') {
                return concat(target.v.map(TargetBases));
              }

              if (target.t === 'IDENTIFIER') {
                return [{
                  t: 'IDENTIFIER-mutationTarget' as 'IDENTIFIER-mutationTarget',
                  v: target.v,
                  p: target.p,
                }];
              }

              return []; // Invalid assignment target detected elsewhere
            }

            const targetBases = TargetBases(mutationTarget);

            const nonTargetChildren = (Syntax
              .Children(el)
              .filter(el => el !== mutationTarget)
            );

            return [...targetBases, ...nonTargetChildren];
          }

          if (el.t === 'Object') {
            return el.v.map(([, exp]) => exp);
          }

          return Syntax.Children(el);
        }
      }
    }
  ));

  items.push(pop);

  for (const item of items) {
    if ('root' in scope) {
      throw new Error('Attempt to process item without a scope');
    }

    if (item.t === 'CreateVariable') {
      const origin: Syntax.Identifier | null = (
        item.v.t === 'IDENTIFIER' ? item.v :
        item.v.v.name
      );

      if (origin === null) {
        throw new Error('Shouldn\'t be possible');
      }

      const preExisting = Scope.get(scope, origin.v);

      if (!preExisting) {
        scope = Scope.add(scope, origin.v, {
          origin,
          data: {
            uses: [],
            mutations: item.v.t === 'IDENTIFIER' ? [] : null,
            captures: [],
            hoistInfo: (
              item.v.t === 'Func' && item.v.topExp ?
              { uses: [], closure: null } :
              null
            ),
          },
        });
      }
    } else if (item.t === 'Push') {
      scope = Scope.push(scope);
    } else if (item.t === 'Pop') {
      for (const varName of Object.keys(scope.entries)) {
        const variable = scope.entries[varName];

        const { hoistInfo } = variable.data;

        if (hoistInfo !== null) {
          for (const use of hoistInfo.uses) {
            if (hoistInfo.closure === null) {
              throw new Error('Shouldn\'t be possible');
            }

            const closuresToProcess = [hoistInfo.closure];

            for (let i = 0; i < closuresToProcess.length; i++) {
              const closure = closuresToProcess[i];

              for (const clItem of closure) {
                const tags: Note.Tag[] = ['validation', 'incomplete-closure'];
                let match = Scope.get(use.scope, clItem.identifier.v);

                // Vortex's strict scoping rules generally make it unnecessary
                // to look beyond the name of a variable to find out whether
                // it's a match, but hoisting functions breaks the rules a
                // little bit, making it necessary to find out whether the same
                // name is actually the same variable here.
                if (match && !identifiersEqual(match.origin, clItem.origin)) {
                  match = null;
                  tags.push('variable-disambiguation');
                }

                if (!match) {
                  if (i > 0) {
                    tags.push('transitive-closure');
                  }

                  notes.push(Note(
                    use.origin.p,
                    'error',
                    tags,
                    (
                      `Function {${use.origin.v}} is not available here ` +
                      `because it captures {${clItem.identifier.v}} which ` +
                      `doesn't exist until after ` +
                      formatLocation(clItem.origin.p)
                    ),
                    [
                      Note(
                        clItem.identifier.p,
                        'info',
                        tags,
                        (
                          `Captured variable {${clItem.identifier.v}} ` +
                          `doesn't exist when {${use.origin.v}} is accessed ` +
                          `at ${formatLocation(use.origin.p)}`
                        ),
                      ),
                      Note(
                        clItem.origin.p,
                        'info',
                        tags,
                        (
                          'There is an attempt to indirectly access ' +
                          `variable {${clItem.origin.v}} when it doesn't ` +
                          `exist at ${formatLocation(use.origin.p)}`
                        ),
                      ),
                    ],
                  ));
                }

                const captureEntry = Scope.get(scope, clItem.identifier.v);

                if (captureEntry && captureEntry.data.hoistInfo) {
                  const extraClosure = captureEntry.data.hoistInfo.closure;

                  if (extraClosure === null) {
                    throw new Error('Shouldn\'t be possible');
                  }

                  if (closuresToProcess.indexOf(extraClosure) === -1) {
                    closuresToProcess.push(extraClosure);
                  }
                }
              }
            }
          }
        }
      }

      scope = scope.parent;
    } else if (
      item.t === 'IDENTIFIER' ||
      item.t === 'IDENTIFIER-mutationTarget'
    ) {
      const scopeEntry = Scope.get<ST>(scope, item.v);

      if (!scopeEntry) {
        const tags: Note.Tag[] = ['validation', 'scope', 'not-found'];

        if (item.t === 'IDENTIFIER-mutationTarget') {
          tags.push('mutation-target');
        }

        // TODO: Look for typos
        notes.push(Note(
          item.p,
          'error',
          tags,
          `Variable ${item.v} does not exist`
        ));
      } else {
        const ident: Syntax.Identifier = {
          t: 'IDENTIFIER',
          v: item.v,
          p: item.p
        };

        const mods: Partial<VInfo['data']> = {};

        checkNull((() => {
          switch (item.t) {
            case 'IDENTIFIER': {
              mods.uses = [...scopeEntry.data.uses, ident];

              if (scopeEntry.data.hoistInfo !== null) {
                // Functions need more detailed usage information
                mods.hoistInfo = { ...scopeEntry.data.hoistInfo,
                  uses: [...scopeEntry.data.hoistInfo.uses,
                    {
                      origin: ident,
                      scope,
                    },
                  ],
                };
              }

              return null;
            }

            case 'IDENTIFIER-mutationTarget': {
              if (scopeEntry.data.mutations === null) {
                notes.push(Note(
                  item.p,
                  'error',
                  ['validation', 'mutation'],
                  // TODO: include reason it's not allowed
                  `Mutating {${scopeEntry.origin.v}} is not allowed`,
                ));

                return null;
              }

              mods.mutations = [...scopeEntry.data.mutations, ident];
              return null;
            }
          }
        })());

        const outerEntry = Scope.get(outerScope, ident.v);

        if (outerEntry) {
          mods.captures = [...scopeEntry.data.captures, ident];
          closure.push({
            origin: outerEntry.origin,
            identifier: ident,
          });
        }

        scope = Scope.set(scope, ident.v, mods);
      }
    } else if (item.t === 'Func') {
      const funcValidation = CapturedNames(scope, item);

      notes.push(...funcValidation.notes);
      scope = funcValidation.scope;

      if (scope === null) {
        // TODO: Can this be omitted by excluding null in the return type of
        // scope?
        throw new Error('Shouldn\'t be possible');
      }

      for (const clItem of funcValidation.closure) {
        if (Scope.get(outerScope, clItem.identifier.v)) {
          closure.push(clItem);
        }
      }

      if (item.topExp && item.v.name !== null) {
        const scopeEntry = Scope.get(scope, item.v.name.v);

        if (!scopeEntry) {
          throw new Error('Should not be possible');
        }

        const hoistInfo = scopeEntry.data.hoistInfo;

        if (!hoistInfo) {
          throw new Error('Should not be possible');
        }

        if (hoistInfo.closure !== null) {
          // TODO: Do function duplicates need to be handled here?
          continue;
        }

        if ('root' in scope) {
          throw new Error('Attempt to process item without a scope');
        }

        scope = Scope.set(scope, item.v.name.v, { ...scopeEntry.data,
          hoistInfo: { ...hoistInfo,
            closure: funcValidation.closure,
          },
        });
      }
    }
  }

  return { notes, closure, scope };
}

function concat<T>(arr: T[][]): T[] {
  const res: T[] = [];

  for (const el of arr) {
    res.push(...el);
  }

  return res;
}
