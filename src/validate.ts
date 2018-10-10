import checkNull from './checkNull';
import formatLocation from './formatLocation';
import Note from './Note';
import Syntax from './parser/Syntax';
import Scope from './Scope';
import traverse from './traverse';

export function validate(program: Syntax.Program): Note[] {
  const notes: Note[] = [];

  notes.push(...validateBody(program));

  notes.push(...traverse<Syntax.Element, Note>(program, el => {
    const subNotes: Note[] = [];

    // TODO: Use a switch?

    const exp = Syntax.expressionFromElement(el);

    if (exp) {
      subNotes.push(...validateExpression(exp));
    }

    if (el.t === 'func') {
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
      let returned = false;

      for (const statement of el.v) {
        if (returned) {
          subNotes.push(Note(
            statement,
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

  notes.push(...validateScope(program));

  return notes;
}

type Push = { t: 'Push' };
const push: Push = { t: 'Push' };

type Pop = { t: 'Pop' };
const pop: Pop = { t: 'Pop' };

type CreateVariable = { t: 'CreateVariable', v: Syntax.Identifier };
type CreateTopFunction = { t: 'CreateTopFunction', v: Syntax.Identifier };

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
  CreateTopFunction |
  IdentifierMutationTarget |
  never
);

type VInfo = {
  uses: Syntax.Identifier[];
  mutations: Syntax.Identifier[];
  captures: Syntax.Identifier[];
  funcInfo: null | {
    uses: {
      origin: Syntax.Identifier;
      scope: Scope<VInfo>;
    }[];
    closure: null | Syntax.Identifier[];
  };
};

function validateScope(block: Syntax.Block) {
  const synthFunction: Syntax.FunctionExpression = {
    t: 'func',
    v: {
      name: null,
      args: [],
      body: block,
    },
    p: block.p,
  };

  const funcValidation = validateFunctionScope(null, synthFunction);

  if (funcValidation.closure.length > 0 || funcValidation.scope !== null) {
    throw new Error('Should not be possible');
  }

  return funcValidation.notes;
}

function validateFunctionScope(
  outerScope: Scope<VInfo> | null,
  func: Syntax.FunctionExpression,
): {
  notes: Note[];
  closure: Syntax.Identifier[];
  scope: Scope<VInfo> | null,
} {
  const notes: Note[] = [];
  let scope: Scope<VInfo> | null = Scope.push<VInfo>(outerScope);
  const closure: Syntax.Identifier[] = [];

  const items: ScopeItem[] = [];

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
        case 'class':
        case 'func':
        case 'Push':
        case 'Pop':
        case 'CreateVariable':
        case 'CreateTopFunction':
        case 'IDENTIFIER-mutationTarget': {
          return [];
        }

        case 'block':
        case 'for': {
          const children: ScopeItem[] = Syntax.Children(el);
          const hoists: CreateTopFunction[] = [];

          for (const child of children) {
            if (child.t === 'e' && child.v.t === 'func' && child.v.v.name) {
              hoists.push({
                t: 'CreateTopFunction',
                v: child.v.v.name,
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
                el.t === 'array' ? [] :
                el.t === 'object' ? [] :
                [el]
              ),
              el => (
                el.t === 'array' ? el.v :
                el.t === 'object' ? el.v.map(([k, v]) => v) :
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

          return Syntax.Children(el);
        }
      }
    }
  ));

  items.push(pop);

  for (const item of items) {
    if (scope === null) {
      throw new Error('Attempt to process item without a scope');
    }

    if (item.t === 'CreateVariable' || item.t === 'CreateTopFunction') {
      const newVariableName = item.v.v;
      const preExisting = Scope.get(scope, newVariableName);

      if (preExisting) {
        const loc = formatLocation(item.v.p);

        notes.push(Note(
          item.v,
          'error',
          ['validation', 'scope', 'duplicate'],
          'Can\'t create variable that already exists',
          [
            Note(
              preExisting.origin,
              'info',
              ['validation', 'scope', 'is-duplicated'],
              `Attempt to create this variable again at ${loc}`,
            )
          ]
        ));
      } else {
        scope = Scope.add(scope, newVariableName, {
          origin: item.v,
          data: {
            uses: [],
            mutations: [],
            captures: [],
            funcInfo: (
              item.t === 'CreateTopFunction' ?
              { uses: [], closure: null } :
              null
            ),
          },
        });
      }
    } else if (item.t === 'Push') {
      scope = {
        parent: scope,
        variables: {},
      };
    } else if (item.t === 'Pop') {
      for (const varName of Object.keys(scope.variables)) {
        const variable = scope.variables[varName];

        if (variable.data.uses.length === 0) {
          if (variable.data.mutations.length === 0) {
            notes.push(Note(
              variable.origin,
              'warn',
              ['validation', 'no-effect', 'scope', 'unused'],
              `Variable ${varName} is not used`,
            ));
          } else {
            notes.push(Note(
              variable.origin,
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

        if (
          variable.data.captures.length > 0 &&
          variable.data.mutations.length > 0
        ) {
          const [headMutation, ...tailMutations] = variable.data.mutations;
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
            headMutation,
            'error',
            tags,
            getErrorMsg(headMutation),
            [
              Note(
                variable.origin,
                'info',
                tags,
                `{${varName}} is captured at ${captureLoc} and mutated ` +
                `at ${mutationLoc}`
              ),
              ...(variable
                .data
                .captures
                .filter(cap => variable.data.mutations.indexOf(cap) === -1)
                .map(cap => Note(
                  cap,
                  'info',
                  tags,
                  (
                    `Capturing {${varName}} here prevents mutation at ` +
                    mutationLoc
                  ),
                ))
              ),
              ...tailMutations.map(mut => Note(
                mut,
                'error',
                tags,
                getErrorMsg(mut),
              )),
            ],
          ));
        }

        const { funcInfo } = variable.data;

        if (funcInfo !== null) {
          for (const use of funcInfo.uses) {
            if (funcInfo.closure === null) {
              throw new Error('Shouldn\'t be possible');
            }

            const closuresToProcess = [funcInfo.closure];

            for (let i = 0; i < closuresToProcess.length; i++) {
              const closure = closuresToProcess[i];

              for (const capturedIdentifier of closure) {
                if (!Scope.get(use.scope, capturedIdentifier.v)) {
                  notes.push(Note(
                    use.origin,
                    'error',
                    ['validation', 'incomplete-closure'],
                    (
                      'This function is not usable yet because it captures ' +
                      `{${capturedIdentifier.v}} but it doesn't exist yet`
                    ),
                    [
                      Note(
                        capturedIdentifier,
                        'info',
                        ['validation', 'incomplete-closure'],
                        (
                          `Captured variable {${capturedIdentifier.v}} does ` +
                          'not yet exist when the function is used at ' +
                          formatLocation(use.origin.p)
                        ),
                      ),
                    ],
                  ));
                }

                const captureEntry = Scope.get(scope, capturedIdentifier.v);

                if (captureEntry && captureEntry.data.funcInfo) {
                  const extraClosure = captureEntry.data.funcInfo.closure;

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
      const scopeEntry = Scope.get<VInfo>(scope, item.v);

      if (!scopeEntry) {
        const tags: Note.Tag[] = ['validation', 'scope', 'not-found'];

        if (item.t === 'IDENTIFIER-mutationTarget') {
          tags.push('mutation-target');
        }

        // TODO: Look for typos
        notes.push(Note(
          item,
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

        const mods: Partial<VInfo> = {};

        checkNull((() => {
          switch (item.t) {
            case 'IDENTIFIER': {
              mods.uses = [...scopeEntry.data.uses, ident];

              if (scopeEntry.data.funcInfo !== null) {
                // Functions need more detailed usage information
                mods.funcInfo = { ...scopeEntry.data.funcInfo,
                  uses: [...scopeEntry.data.funcInfo.uses,
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
              mods.mutations = [...scopeEntry.data.uses, ident];
              return null;
            }
          }
        })());

        if (Scope.get(outerScope, ident.v)) {
          mods.captures = [...scopeEntry.data.captures, ident];
          closure.push(ident);
        }

        scope = Scope.set(scope, ident.v, mods);
      }
    } else if (item.t === 'func') {
      const funcValidation = validateFunctionScope(scope, item);

      notes.push(...funcValidation.notes);
      scope = funcValidation.scope;

      if (scope === null) {
        // TODO: Can this be omitted by excluding null in the return type of
        // scope?
        throw new Error('Shouldn\'t be possible');
      }

      for (const identifier of funcValidation.closure) {
        if (Scope.get(outerScope, identifier.v)) {
          closure.push(identifier);
        }
      }

      if (item.topExp && item.v.name !== null) {
        const scopeEntry = Scope.get(scope, item.v.name.v);

        if (!scopeEntry) {
          throw new Error('Should not be possible');
        }

        const funcInfo = scopeEntry.data.funcInfo;

        if (!funcInfo) {
          throw new Error('Should not be possible');
        }

        if (funcInfo.closure !== null) {
          // TODO: Do function duplicates need to be handled here?
          continue;
        }

        scope = Scope.set(scope, item.v.name.v, { ...scopeEntry.data,
          funcInfo: { ...funcInfo,
            closure: funcValidation.closure,
          },
        });
      }
    }
  }

  return { notes, closure, scope };
}

function validateBody(body: Syntax.Block): Note[] {
  const lastStatement: Syntax.Statement | undefined = (
    body.v[body.v.length - 1]
  );

  if (!lastStatement) {
    return [Note(
      body,
      'error',
      ['validation', 'control-flow', 'return-failure', 'empty-body'],
      'Empty body',
    )];
  }

  return validateStatementWillReturn(lastStatement);
}

function validateMethodBody(body: Syntax.Block): Note[] {
  if (!hasReturn(body)) {
    // Methods are allowed to not have return statements. In this case they
    // implicitly `return this;`. However, if there are any return statements,
    // an implied `return this;` does not occur and the regular rules apply.
    return [];
  }

  return validateBody(body);
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

  if (['func', 'class'].indexOf(e.t) !== -1) {
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

    if (exp.t === 'array') {
      if (exp.v.length === 0) {
        invalids.push(exp);
        return;
      }

      for (const itemExp of exp.v) {
        invalids.push(...InvalidAssignmentTargets(itemExp));
      }

      return;
    }

    if (exp.t === 'object') {
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

function validateExpression(exp: Syntax.Expression): Note[] {
  const notes: Note[] = [];

  if (exp.topExp && !isValidTopExpression(exp)) {
    notes.push(Note(
      exp,
      'warn',
      ['validation', 'no-effect', 'top-expression'],
      'Statement has no effect', // TODO: better wording
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
            invalid,
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
            exp,
            'error',
            ['validation', 'scope', 'subexpression-mutation'],
            `${action} a variable in a subexpression is not allowed`,
          ));
        }

        return null;
      }

      case 'object': {
        const keys: { [key: string]: true | undefined } = {};

        for (const [identifier] of exp.v) {
          if (keys[identifier.v]) {
            notes.push(Note(
              identifier,
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
      case 'func':
      case 'functionCall':
      case 'array':
      case 'subscript':
      case '.':
      case 'methodCall':
      case 'class':
      case 'switch':
      case 'import':
        return null;
    }
  })());

  return notes;
}

function validateStatementWillReturn(statement: Syntax.Statement): Note[] {
  if (statement.t === 'return') {
    return [];
  }

  if (statement.t === 'for') {
    const { control, block } = statement.v;

    const issues: Note[] = [];

    if (!hasReturn(block)) {
      issues.push(Note(
        statement,
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
        brk,
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
        statement,
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
    statement,
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
