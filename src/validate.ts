import formatLocation from './formatLocation';
import Note from './Note';
import { Syntax } from './parser/parse';

export function validate(program: Syntax.Program): Note[] {
  const issues: Note[] = [];

  issues.push(...validateBody(program));

  issues.push(...traverse<Syntax.Element, Note>(program, el => {
    const subIssues: Note[] = [];

    let potentialSubExpressions = (
      el.t === 'e' ?
      Syntax.Children(el.v) :
      Syntax.Children(el)
    );

    if (el.t === 'for' && el.v[0][0] === 'traditional') {
      // Don't consider init from (init; cond; inc) to be a subexpression
      potentialSubExpressions = potentialSubExpressions.slice(1);
    }

    for (const child of potentialSubExpressions) {
      const subexpression = Syntax.expressionFromElement(child);

      if (subexpression !== null) {
        subIssues.push(...validateSubexpression(subexpression));
      }
    }

    if (el.t === 'e') {
      // TODO: rename e -> expressionStatement?

      // TODO: Dear typescript: why do I need el.t === 'e' again here?
      if (el.t === 'e' && !isValidTopExpression(el.v)) {
        subIssues.push(Note(el, 'error',
          'Statement has no effect'
        ));
      }
    } else if (el.t === 'func') {
      const [, , body] = el.v;

      if (body.t === 'block') {
        subIssues.push(...validateBody(body));
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
          subIssues.push(...validateMethodBody(body));
        }
      }
    } else if (el.t === 'block') {
      let returned = false;

      for (const statement of el.v) {
        if (returned) {
          subIssues.push(
            Note(statement, 'error', 'Statement is unreachable')
          );
        }

        if (statement.t === 'return') {
          returned = true;
        }
      }
    }

    return subIssues;
  }, Syntax.Children));

  issues.push(...validateScope(program.v));

  return issues;
}

type Push = { t: 'Push' };
const push: Push = { t: 'Push' };

type Pop = { t: 'Pop' };
const pop: Pop = { t: 'Pop' };

type CreateVariable = { t: 'CreateVariable', v: Syntax.Identifier };

type IdentifierAssignTarget = {
  t: 'IDENTIFIER-assignTarget',
  v: string,
  p: Syntax.Pos,
};

type ScopeItem = (
  Syntax.Element |
  Push |
  Pop |
  CreateVariable |
  IdentifierAssignTarget |
  never
);

function validateScope(elements: ScopeItem[]): Note[] {
  elements.push(pop);
  const issues: Note[] = [];

  type Variable = {
    origin: Syntax.Identifier;
    used: boolean;
    assigned: boolean;
  };

  type Scope = {
    parent: Scope | null;
    variables: {
      [name: string]: Variable;
    };
  };

  function lookup(s: Scope, name: string): Variable | null {
    return (
      (s.variables[name] || null) ||
      s.parent && lookup(s.parent, name)
    );
  }

  function modifyVariable(
    s: Scope,
    name: string,
    mods: Partial<Variable>
  ): Scope {
    const curr = s.variables[name];

    if (curr) {
      // vault concept version:
      // return s.variables[name] += mods; // TODO hmm += or custom operator?
      // or
      // return s.variables[name] = { ...s.variables[name], ...mods };
      return {
        parent: s.parent,
        variables: {
          ...s.variables,
          [name]: { ...curr, ...mods }
        }
      };
    }

    if (!s.parent) {
      throw new Error('Tried to modify variable that doesn\'t exist');
    }

    return {
      parent: modifyVariable(s.parent, name, mods),
      variables: s.variables,
    };
  }

  let scope: Scope | null = { parent: null, variables: {} };

  for (const element of elements) {
    const items: ScopeItem[] = traverse<ScopeItem, ScopeItem>(
      element,
      el => [el],
      el => {
        switch (el.t) {
          case 'Push':
          case 'Pop':
          case 'CreateVariable':
          case 'IDENTIFIER-assignTarget':
            return [];

          case 'class': {
            return [
              push,
              /* TODO
              {
                t: 'CreateVariable',
                v: el.v.name,
              },
             */
              ...Syntax.Children(el),
              pop,
            ];
          }

          case 'func': {
            // const [name] = el.v;

            return [
              push,
              /* TODO
              ...(name === null ? [] : [{
                t: 'CreateVariable',
                v: name,
              }]),
               */
              ...Syntax.Children(el),
              pop,
            ];
          }

          case 'block':
          case 'for':
            return [push, ...Syntax.Children(el), pop];

          case ':=':
            let children: ScopeItem[] = Syntax.Children(el);
            const left = el.v[0];

            if (left.t === 'IDENTIFIER') {
              if (children[0].t !== 'IDENTIFIER') {
                throw new Error('Expected first child to be identifier');
              }

              children.shift(); // Remove reference to self
              children = [{ t: 'CreateVariable', v: left }, ...children];
            }

            return children;

          default:
            if (Syntax.isAssignmentOperator(el.t)) {
              // TODO: any usage below... needed because typescript can't
              // figure this situation out I think
              let assignTarget: Syntax.Element = (el as any).v[0];

              while (assignTarget.t === '.') {
                assignTarget = assignTarget.v[0];
              }

              if (assignTarget.t === 'IDENTIFIER') {
                const name = assignTarget.v;

                return Syntax.Children(el).map(child => {
                  if (child !== assignTarget) {
                    return child;
                  }

                  // More typescript griping: it's really silly that typescript
                  // requires 'as' below
                  return {
                    t: 'IDENTIFIER-assignTarget' as 'IDENTIFIER-assignTarget',
                    v: name,
                    p: assignTarget.p,
                  };
                });
              }
            }

            return Syntax.Children(el);
        }
      }
    );

    for (const item of items) {
      if (scope === null) {
        throw new Error('Attempt to process item without a scope');
      }

      if (item.t === 'CreateVariable') {
        const newVariableName = item.v.v;
        const preExisting = lookup(scope, newVariableName);

        if (preExisting) {
          issues.push(Note(item.v, 'error',
            'Can\'t create variable that already exists'
          ));

          const loc = formatLocation(item.v.p);

          issues.push(Note(preExisting.origin, 'info',
            `Attempt to create this variable again at ${loc}`
          ));
        } else {
          scope = {
            parent: scope.parent,
            variables: { ...scope.variables,
              [newVariableName]: {
                origin: item.v,
                used: false,
                assigned: false,
              },
            },
          };
        }
      } else if (item.t === 'Push') {
        scope = {
          parent: scope,
          variables: {},
        };
      } else if (item.t === 'Pop') {
        for (const varName of Object.keys(scope.variables)) {
          const variable = scope.variables[varName];

          if (!variable.used) {
            if (!variable.assigned) {
              issues.push(Note(variable.origin, 'warning',
                `Variable ${varName} is not used`
              ));
            } else {
              issues.push(Note(variable.origin, 'warning',
                `Variable ${varName} is assigned but never used, so it ` +
                `can't affect the return value`
              ));
            }
          }
        }

        scope = scope.parent;
      } else if (item.t === 'IDENTIFIER') {
        const scopeEntry = lookup(scope, item.v);

        if (!scopeEntry) {
          // TODO: Look for typos
          issues.push(Note(item, 'error',
            `Variable ${item.v} does not exist`
          ));
        } else {
          // imagine... scope[item.v].used = true... :-D
          scope = modifyVariable(scope, item.v, { used: true });
        }
      } else if (item.t === 'IDENTIFIER-assignTarget') {
        const scopeEntry = lookup(scope, item.v);

        if (!scopeEntry) {
          // TODO: Look for typos
          issues.push(Note(item, 'error',
            `Variable ${item.v} does not exist`
          ));
        } else {
          scope = modifyVariable(scope, item.v, { assigned: true });
        }
      }
    }
  }

  return issues;
}

function validateBody(body: Syntax.Block): Note[] {
  const lastStatement: Syntax.Statement | undefined = (
    body.v[body.v.length - 1]
  );

  if (!lastStatement) {
    return [Note(body, 'error', 'Empty body')];
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
    'prefix ++',
    'postfix ++',
    'prefix --',
    'postfix --',
  ];

  if (incDecOperators.indexOf(e.t) !== -1) {
    return true;
  }

  if (['func', 'class'].indexOf(e.t) !== -1) {
    return true;
  }

  return false;
}

function validateSubexpression(e: Syntax.Expression): Note[] {
  // TODO: e is not a good variable name because 'e' is used for expression
  // statements... really the issue is that 'e' should be good and expression
  // statements should have some other .t value.

  const issues: Note[] = [];

  if (e.t === ':=' && e.v[0].t === 'IDENTIFIER') {
    issues.push(Note(e, 'error',
      'Creating a variable in a subexpression is not allowed'
    ));
  }

  // Note: don't need to go down into the subexpression since we're already
  // recursively descending the tree and each subexpression will be called and
  // asked to shallowly validate its child subexpressions

  return issues;
}

function validateStatementWillReturn(statement: Syntax.Statement): Note[] {
  if (statement.t === 'return') {
    return [];
  }

  if (statement.t === 'for') {
    const [typeClause, block] = statement.v;
    const [type] = typeClause;

    const issues: Note[] = [];

    if (!hasReturn(block)) {
      issues.push(Note(statement, 'error', (
        'For loop doesn\'t return a value since it doesn\'t have any return ' +
        'statements'
      )));
    }

    if (type === 'loop') {
      const breaks = findBreaks(block);

      issues.push(...breaks.map(brk => Note(brk, 'error', (
        'Break statement not allowed in for loop which needs to return a ' +
        'value (either add a return statement after the loop or remove it)'
      ))));
    } else {
      const clauseStr: string = (() => {
        switch (type) {
          case 'condition': return '(condition)';
          case 'of': return '(item of range)';
          case 'traditional': return '(init; condition; inc)';
        }
      })();

      issues.push(Note(statement, 'error', (
        `${clauseStr} clause not allowed in for loop which needs to ` +
        `return a value (either add a return statement after the loop or ` +
        `remove ${clauseStr})`
      )));
    }

    return issues;
  }

  return [Note(statement, 'error',
    'Last statement of body does not return'
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

    if (statement.t === 'if' || statement.t === 'for') {
      const [, subBlock] = statement.v;

      if (hasReturn(subBlock)) {
        return true;
      }
    }
  }

  return false;
}

function traverse<E, T>(
  element: E,
  visit: (el: E) => T[],
  Children: (el: E) => E[],
): T[] {
  const results: T[] = [];

  for (const child of Children(element)) {
    results.push(...traverse(child, visit, Children));
  }

  results.push(...visit(element));

  return results;
}
