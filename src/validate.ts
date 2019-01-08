import checkNull from './checkNull';
import formatLocation from './formatLocation';
import identifiersEqual from './identifiersEqual';
import Note from './Note';
import Syntax from './parser/Syntax';
import Scope from './Scope';
import traverse from './traverse';

export type Importer = (importExp: Syntax.Import) => Note[];

export function validate(program: Syntax.Program): Note[] {
  if (process.argv.indexOf('--no-validation') !== -1) {
    return [];
  }

  const notes: Note[] = [];

  notes.push(...validateBody(program));

  notes.push(...traverse<Syntax.Element, Note>(program, el => {
    const subNotes: Note[] = [];

    // TODO: Use a switch?

    const exp = Syntax.expressionFromElement(el);

    if (exp) {
      subNotes.push(...validateExpression(exp));
    }

    if (el.t === 'Func') {
      const { body } = el.v;

      if (body.t === 'block') {
        subNotes.push(...validateBody(body));
      }
    } else if (el.t === 'for') {
      // TODO: Disallow shallow return unless continue might occur
      // beforehand
      // TODO: Check init, inc in (init; cond; inc) are valid top(ish)
      // expressions (ish because eg making a function in init isn't ok)
    } else if (el.t === 'class') {
      const methodBodies = el.v.methods.map(m => m.body);

      for (const body of methodBodies) {
        if (body.t === 'block') {
          // TODO: Allow methods to implicitly return this? Enforce return
          // consistency at least.
          subNotes.push(...validateMethodBody(body));
        }
      }
    } else if (el.t === 'block') {
      let reachable = true;

      for (const statement of el.v) {
        if (!reachable) {
          subNotes.push(Note(
            statement.p,
            'warn',
            ['validation', 'control-flow', 'unreachable'],
            'Statement is unreachable'
          ));
        }

        if (
          statement.t === 'return' ||
          statement.t === 'break' ||
          statement.t === 'continue'
        ) {
          reachable = false;
        }
      }
    }

    return subNotes;
  }, Syntax.Children));

  notes.push(...validateScope(program));

  return notes;
}

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

type Closure = {
  identifier: Syntax.Identifier;
  origin: Syntax.Identifier;
}[];

type ST = {
  root: {};
  entry: VInfo;
};

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

function validateScope(block: Syntax.Block) {
  const synthFunction: Syntax.FunctionExpression = {
    t: 'Func',
    v: {
      name: null,
      args: [],
      body: block,
    },
    p: block.p,
  };

  const funcValidation = validateFunctionScope(
    { root: {} },
    synthFunction,
  );

  if (funcValidation.closure.length > 0 || !('root' in funcValidation.scope)) {
    throw new Error('Should not be possible');
  }

  return funcValidation.notes;
}

function validateFunctionScope(
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

          return [{ t: 'CreateVariable', v: Syntax.IdentifierFromImport(el) }];
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

      if (preExisting) {
        notes.push(Note(
          item.v.p,
          'error',
          ['validation', 'scope', 'duplicate'],
          'Can\'t create variable that already exists',
          [
            Note(
              preExisting.origin.p,
              'info',
              ['validation', 'scope', 'is-duplicated'],
              (
                `There is an attempt to create {${preExisting.origin.v}} ` +
                `again at ${formatLocation(item.v.p)}`
              ),
            )
          ]
        ));
      } else {
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

        if (variable.data.uses.length === 0) {
          if (
            variable.data.mutations === null ||
            variable.data.mutations.length === 0
          ) {
            notes.push(Note(
              variable.origin.p,
              'warn',
              ['validation', 'no-effect', 'scope', 'unused'],
              `Variable ${varName} is not used`,
            ));
          } else {
            notes.push(Note(
              variable.origin.p,
              'warn',
              [
                'validation',
                'no-effect',
                'scope',
                'unused',
                'mutation'
              ],
              `Variable ${varName} is mutated but never used, so it ` +
              `can't affect the return value`
            ));
          }
        }

        const mutations = variable.data.mutations;

        if (
          variable.data.captures.length > 0 &&
          mutations && mutations.length > 0
        ) {
          const [headMutation, ...tailMutations] = mutations;
          const captureLoc = formatLocation(variable.data.captures[0].p);
          const mutationLoc = formatLocation(headMutation.p);

          const tags: Note.Tag[] = [
            'validation',
            'scope',
            'mutation',
            'capture',
            'capture-mutation',
          ];

          function getErrorMsg(mut: Syntax.Identifier) {
            if (variable.data.captures.indexOf(mut) !== -1) {
              return `Can't mutate captured variable {${varName}}`;
            }

            return (
              `Can't mutate {${varName}} because it is captured at ` +
              captureLoc
            );
          }

          notes.push(Note(
            headMutation.p,
            'error',
            tags,
            getErrorMsg(headMutation),
            [
              Note(
                variable.origin.p,
                'info',
                tags,
                `{${varName}} is captured at ${captureLoc} and mutated ` +
                `at ${mutationLoc}`
              ),
              ...(variable
                .data
                .captures
                .filter(cap => mutations.indexOf(cap) === -1)
                .map(cap => Note(
                  cap.p,
                  'info',
                  tags,
                  (
                    `Capturing {${varName}} here prevents mutation at ` +
                    mutationLoc
                  ),
                ))
              ),
              ...tailMutations.map(mut => Note(
                mut.p,
                'error',
                tags,
                getErrorMsg(mut),
              )),
            ],
          ));
        }

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
                    // Having hoistInfo but no closure usually does not occur
                    // because the hoistInfo has been populated for all
                    // hoisted functions in the scope currently being
                    // validated.
                    //
                    // However, we can hit this case when capturing a function
                    // further up the scope chain
                    //
                    // Eg#1: (passes)
                    //   x := 7;
                    //
                    //   func foo() {
                    //     func bar() => x + foo();
                    //     return bar();
                    //   };
                    //
                    //   return foo();
                    //
                    // Eg#2: (passes)
                    //   res := null;
                    //   x := 7;
                    //
                    //   if (true) {
                    //     func bar() => foo();
                    //     res = bar();
                    //   }
                    //
                    //   func foo() => x;
                    //
                    //   return res;
                    //
                    // Eg#3: (fails)
                    //   res := null;
                    //
                    //   if (true) {
                    //     res = bar();
                    //     func bar() => foo(); // foo not available here
                    //   }
                    //
                    //   x := 7;
                    //   func foo() => x;
                    //
                    //   return res;
                    //
                    // Eg#4: (fails)
                    //   res := null;
                    //
                    //   if (true) {
                    //     res = bar();
                    //
                    //     // Hoisting bar above foo's x here would be
                    //     // something we would miss, however it's impossible
                    //     // for foo's x to be defined here since it is not in
                    //     // scope when foo tries to reference it.
                    //     x := 7;
                    //
                    //     func bar() => foo();
                    //   }
                    //
                    //   func foo() => x; // x does not exist
                    //
                    //   return res;
                    //
                    // Since foo's validation occurs after bar's validation,
                    // bar is unable to reference foo before it is valid, and
                    // foo cannot have captures that are defined between bar's
                    // hoist location and bar's definition, bar cannot be
                    // referenced too early as a consequence of foo's captures.
                    //
                    // So these cases are ok, we just need to ensure that
                    // clItem really does come from further up the scope chain.

                    const outerEntry = (
                      Scope.get(scope.parent, clItem.identifier.v)
                    );

                    if (outerEntry === null) {
                      throw new Error('Shouldn\'t be possible');
                    }
                  } else if (closuresToProcess.indexOf(extraClosure) === -1) {
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
      const funcValidation = validateFunctionScope(scope, item);

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

function validateBody(body: Syntax.Block): Note[] {
  const notes: Note[] = [];

  const controls = findControlStatements(body);

  notes.push(...controls.map(control => Note(
    control.p,
    'error',
    [
      'validation',
      'control-flow',
      'loop-control-outside-loop',
    ],
    control.t + ' statement outside loop',
  )));

  notes.push(...validateReturn(body));

  return notes;
}

function validateReturn(body: Syntax.Block): Note[] {
  const lastStatement: Syntax.Statement | undefined = (
    body.v[body.v.length - 1]
  );

  if (!lastStatement) {
    return [Note(
      lastChar(body.p),
      'error',
      ['validation', 'control-flow', 'return-failure', 'empty-body'],
      'Control reaches end of body without returning a value',
    )];
  }

  const { ok, notes } = validateStatementWillReturn(lastStatement);

  if (!ok) {
    notes.push(Note(
      lastChar(body.p),
      'error',
      ['validation', 'control-flow', 'return-failure'],
      'Control might reach end of body without returning a value',
    ));
  }

  return notes;
}

function lastChar(pos: Syntax.Pos): Syntax.Pos {
  const [file, [, end]] = pos;
  return [file, [end, end]];
}

function validateMethodBody(body: Syntax.Block): Note[] {
  if (!hasReturn(body)) {
    // Methods are allowed to not have return statements. In this case they
    // implicitly `return this;`. However, if there are any return statements,
    // an implied `return this;` does not occur and the regular rules apply.
    return [];
  }

  return validateReturn(body);
}

function isValidTopExpression(e: Syntax.Expression) {
  if (Syntax.isAssignmentOperator(e.t) || e.t === ':=') {
    return true;
  }

  const incDecOperators = [
    'unary ++',
    'unary --',
  ];

  if (incDecOperators.indexOf(e.t) !== -1) {
    return true;
  }

  if (e.t === 'Func' || e.t === 'class') {
    // TODO: Better message, #unused
    return e.v.name !== null;
  }

  if (e.t === 'import') {
    return true;
  }

  return false;
}

function InvalidAssignmentTargets(
  exp: Syntax.Expression
): Syntax.Expression[] {
  const invalids: Syntax.Expression[] = [];

  (() => {
    if (exp.t === 'IDENTIFIER') {
      return;
    }

    if (exp.t === 'Array') {
      if (exp.v.length === 0) {
        invalids.push(exp);
        return;
      }

      for (const itemExp of exp.v) {
        invalids.push(...InvalidAssignmentTargets(itemExp));
      }

      return;
    }

    if (exp.t === 'Object') {
      if (exp.v.length === 0) {
        invalids.push(exp);
        return;
      }

      for (const [, targetExp] of exp.v) {
        invalids.push(...InvalidAssignmentTargets(targetExp));
      }

      return;
    }

    if (exp.t === 'subscript' || exp.t === '.') {
      let baseExp = exp.v[0];

      while (baseExp.t === 'subscript' || baseExp.t === '.') {
        baseExp = baseExp.v[0];
      }

      if (baseExp.t !== 'IDENTIFIER') {
        invalids.push(exp);
      }

      return;
    }

    invalids.push(exp);
  })();

  return invalids;
}

function validateMutation(
  exp: Syntax.Expression,
  target: Syntax.Expression,
  action: string,
): Note[] {
  const notes: Note[] = [];

  for (const invalid of InvalidAssignmentTargets(target)) {
    notes.push(Note(
      invalid.p,
      'error',
      ['validation', 'invalid-assignment-target'],
      [
        'Invalid assignment target: ',
        invalid.t,
        ' expression',
        // TODO: Link documentation explaining assignment targets
      ].join(''),
    ));
  }

  if (!exp.topExp) {
    notes.push(Note(
      exp.p,
      'error',
      ['validation', 'scope', 'subexpression-mutation'],
      `${action} a variable in a subexpression is not allowed`,
    ));
  }

  return notes;
}

function validateExpression(exp: Syntax.Expression): Note[] {
  const notes: Note[] = [];

  if (exp.topExp && !isValidTopExpression(exp)) {
    notes.push(Note(
      exp.p,
      'warn',
      ['validation', 'no-effect', 'top-expression', 'unused'],
      'Unused expression', // TODO: better wording
    ));
  }

  checkNull((() => {
    switch (exp.t) {
      case '=':
      case '+=':
      case '++=':
      case '-=':
      case '*=':
      case '/=':
      case '%=':
      case '<<=':
      case '>>=':
      case '&=':
      case '^=':
      case '|=':
      case ':=': {
        notes.push(...validateMutation(
          exp,
          exp.v[0],
          exp.t === ':=' ? 'Creating' : 'Assigning to',
        ));

        return null;
      }

      case 'unary ++':
      case 'unary --': {
        notes.push(...validateMutation(
          exp,
          exp.v,
          exp.t === 'unary ++' ? 'Incrementing' : 'Decrementing'
        ));

        return null;
      }

      case 'Object': {
        const keys: { [key: string]: true | undefined } = {};

        for (const [identifier] of exp.v) {
          if (keys[identifier.v]) {
            notes.push(Note(
              identifier.p,
              'error',
              ['validation', 'object', 'duplicate', 'duplicate-key'],
              `Duplicate key '${identifier.v}' in object literal`,
            ));
          }

          keys[identifier.v] = true;
        }

        return null;
      }

      case 'NUMBER': {
        if (
          (exp.v.indexOf('u') !== -1 || exp.v.indexOf('i') !== -1) &&
          !/^[0-9]+(u|([ui](8|16|32|64)))$/.test(exp.v)
        ) {
          notes.push(Note(
            exp.p,
            'error',
            ['validation', 'number'],
            'Invalid number literal',
          ));
        }

        if (
          exp.v.indexOf('f') !== -1 &&
          !/^[0-9]+(\.[0-9]+)?f(8|16|32|64)$/.test(exp.v)
        ) {
          notes.push(Note(
            exp.p,
            'error',
            ['validation', 'number'],
            'Invalid number literal',
          ));
        }

        return null;
      }

      case 'BOOL':
      case 'NULL':
      case 'STRING':
      case 'IDENTIFIER':
      case 'unary --':
      case 'unary ++':
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
      case 'unary !':
      case 'unary ~':
      case 'Func':
      case 'op':
      case 'functionCall':
      case 'Array':
      case 'subscript':
      case '.':
      case 'methodLookup':
      case 'class':
      case 'import':
      case 'switch':
        return null;
    }
  })());

  return notes;
}

function validateStatementWillReturn(
  statement: Syntax.Statement,
): {
  ok: boolean,
  notes: Note[]
} {
  if (statement.t === 'return') {
    return { ok: true, notes: [] };
  }

  let ok = true;

  if (statement.t === 'for') {
    const { control, block } = statement.v;

    const notes: Note[] = [];

    if (!hasReturn(block)) {
      notes.push(Note(
        statement.p,
        'warn',
        [
          'validation',
          'control-flow',
          'return-failure',
          'for-return',
          'no-inner-return',
        ],
        (
          'For loop doesn\'t return a value since it doesn\'t have any ' +
          'return statements'
        ),
      ));

      ok = false;
    }

    if (control === null) {
      const breaks = findBreaks(block);

      if (breaks.length > 0) {
        ok = false;
      }

      notes.push(...breaks.map(brk => Note(
        brk.p,
        'warn',
        [
          'validation',
          'control-flow',
          'return-failure',
          'for-return',
          'break-prevents-return',
        ],
        (
          'Break statement in for loop prevents it from always returning a ' +
          'value (either add a return statement after the loop or remove it)'
        ),
      )));
    } else {
      ok = false;

      notes.push(Note(
        statement.p,
        'warn',
        [
          'validation',
          'control-flow',
          'return-failure',
          'for-return',
          'control-clause-prevents-return',
        ],
        (
          `(${control.t}) clause prevents for loop from always returning a ` +
          `value (either add a return statement after the loop or remove ` +
          `(${control.t}))`
        ),
      ));
    }

    return { ok, notes };
  }

  return { ok: false, notes: [] };
}

function findBreaks(
  el: Syntax.Block
): Syntax.BreakStatement[] {
  return traverse<Syntax.Element, Syntax.BreakStatement>(
    el,
    el => el.t === 'break' ? [el] : [],
    el => el.t === 'block' || el.t === 'if' ? Syntax.Children(el) : [],
  );
}

function findControlStatements(
  el: Syntax.Block
): (Syntax.BreakStatement | Syntax.ContinueStatement)[] {
  return traverse<
    Syntax.Element,
    Syntax.BreakStatement | Syntax.ContinueStatement
  >(
    el,
    el => el.t === 'break' || el.t === 'continue' ? [el] : [],
    el => el.t === 'block' || el.t === 'if' ? Syntax.Children(el) : [],
  );
}

function hasReturn(block: Syntax.Block) {
  const returns = traverse<Syntax.Element, Syntax.ReturnStatement>(
    block,
    el => el.t === 'return' ? [el] : [],
    el => (
      el.t === 'block' || el.t === 'if' || el.t === 'for' ?
      Syntax.Children(el) :
      []
    ),
  );

  return returns.length > 0;
}

function concat<T>(arr: T[][]): T[] {
  const res: T[] = [];

  for (const el of arr) {
    res.push(...el);
  }

  return res;
}
