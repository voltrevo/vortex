import checkNull from './checkNull';
import formatLocation from './formatLocation';
import identifiersEqual from './identifiersEqual';
import Note from './Note';
import Syntax from './parser/Syntax';
import Scope from './Scope';
import traverse from './traverse';

export type Importer = (importExp: Syntax.Import) => Note[];

export function validate(file: string, program: Syntax.Program): Note[] {
  const notes: Note[] = [];

  notes.push(...validateBody(file, program));

  notes.push(...traverse<Syntax.Element, Note>(program, el => {
    const subNotes: Note[] = [];

    // TODO: Use a switch?

    const exp = Syntax.expressionFromElement(el);

    if (exp) {
      subNotes.push(...validateExpression(file, exp));
    }

    if (el.t === 'Func') {
      const { body } = el.v;

      if (body.t === 'block') {
        subNotes.push(...validateBody(file, body));
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
          subNotes.push(...validateMethodBody(file, body));
        }
      }
    } else if (el.t === 'block') {
      let returned = false;

      for (const statement of el.v) {
        if (returned) {
          subNotes.push(Note(
            statement.p,
            'warn',
            ['validation', 'control-flow', 'unreachable'],
            'Statement is unreachable'
          ));
        }

        if (statement.t === 'return') {
          returned = true;
        }
      }
    }

    return subNotes;
  }, Syntax.Children));

  notes.push(...validateScope(file, program));

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

function validateScope(file: string, block: Syntax.Block) {
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
    file,
    { root: {} },
    synthFunction,
  );

  if (funcValidation.closure.length > 0 || !('root' in funcValidation.scope)) {
    throw new Error('Should not be possible');
  }

  return funcValidation.notes;
}

function validateFunctionScope(
  file: string,
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
    items.push({
      t: 'CreateVariable',
      v: arg.v[0],
    });
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

        case 'block':
        case 'for': {
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

          const children: ScopeItem[] = [];

          for (const target of targets) {
            if (target.t === 'IDENTIFIER') {
              children.push({ t: 'CreateVariable', v: target });
            } else {
              children.push(target);
            }
          }

          children.push(right);

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
          } else if (el.t === '++' || el.t === '--') {
            mutationTarget = el.v;
          }

          if (mutationTarget !== null) {
            while (
              mutationTarget.t === '.' ||
              mutationTarget.t === 'subscript'
            ) {
              mutationTarget = mutationTarget.v[0];
            }

            if (mutationTarget.t === 'IDENTIFIER') {
              const name = mutationTarget.v;

              return Syntax.Children(el).map(child => {
                if (child !== mutationTarget) {
                  return child;
                }

                // More typescript griping: it's really silly that typescript
                // requires 'as' below
                return {
                  t: 'IDENTIFIER-mutationTarget' as 'IDENTIFIER-mutationTarget',
                  v: name,
                  p: mutationTarget.p,
                };
              });
            }
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
                      `doesn't exist until ${formatLocation(clItem.origin.p)}`
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
      const funcValidation = validateFunctionScope(file, scope, item);

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

function validateBody(file: string, body: Syntax.Block): Note[] {
  const lastStatement: Syntax.Statement | undefined = (
    body.v[body.v.length - 1]
  );

  if (!lastStatement) {
    return [Note(
      body.p,
      'error',
      ['validation', 'control-flow', 'return-failure', 'empty-body'],
      'Empty body',
    )];
  }

  return validateStatementWillReturn(file, lastStatement);
}

function validateMethodBody(file: string, body: Syntax.Block): Note[] {
  if (!hasReturn(body)) {
    // Methods are allowed to not have return statements. In this case they
    // implicitly `return this;`. However, if there are any return statements,
    // an implied `return this;` does not occur and the regular rules apply.
    return [];
  }

  return validateBody(file, body);
}

function isValidTopExpression(e: Syntax.Expression) {
  if (Syntax.isAssignmentOperator(e.t) || e.t === ':=') {
    return true;
  }

  const incDecOperators = [
    '++',
    '--',
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

function validateExpression(file: string, exp: Syntax.Expression): Note[] {
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
        for (const invalid of InvalidAssignmentTargets(exp.v[0])) {
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
          const action = exp.t === ':=' ? 'Creating' : 'Assigning to';

          notes.push(Note(
            exp.p,
            'error',
            ['validation', 'scope', 'subexpression-mutation'],
            `${action} a variable in a subexpression is not allowed`,
          ));
        }

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
      case 'Func':
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
  file: string,
  statement: Syntax.Statement,
): Note[] {
  if (statement.t === 'return') {
    return [];
  }

  if (statement.t === 'for') {
    const { control, block } = statement.v;

    const issues: Note[] = [];

    if (!hasReturn(block)) {
      issues.push(Note(
        statement.p,
        'error',
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
    }

    if (control === null) {
      const breaks = findBreaks(block);

      issues.push(...breaks.map(brk => Note(
        brk.p,
        'error',
        [
          'validation',
          'control-flow',
          'return-failure',
          'for-return',
          'break-prevents-return',
        ],
        (
          'Break statement not allowed in for loop which needs to return a ' +
          'value (either add a return statement after the loop or remove it)'
        ),
      )));
    } else {
      issues.push(Note(
        statement.p,
        'error',
        [
          'validation',
          'control-flow',
          'return-failure',
          'for-return',
          'control-clause-prevents-return',
        ],
        (
          `(${control.t}) clause not allowed in for loop which needs to ` +
          `return a value (either add a return statement after the loop or ` +
          `remove (${control.t}))`
        ),
      ));
    }

    return issues;
  }

  return [Note(
    statement.p,
    'error',
    ['validation', 'control-flow', 'return-failure'],
    'Last statement of body does not return',
  )];
}

function findBreaks(
  block: Syntax.Block
): Syntax.BreakStatement[] {
  const breaks: Syntax.BreakStatement[] = [];

  for (const statement of block.v) {
    if (statement.t === 'break') {
      breaks.push(statement);
    } else if (statement.t === 'if') {
      const [, ifBlock] = statement.v;
      breaks.push(...findBreaks(ifBlock));
    }
  }

  return breaks;
}

function hasReturn(block: Syntax.Block) {
  for (const statement of block.v) {
    if (statement.t === 'return') {
      return true;
    }

    if (statement.t === 'if') {
      const [, subBlock] = statement.v;

      if (hasReturn(subBlock)) {
        return true;
      }
    }

    if (statement.t === 'for') {
      const { block: subBlock } = statement.v;

      if (hasReturn(subBlock)) {
        return true;
      }
    }
  }

  return false;
}
