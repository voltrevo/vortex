import { Syntax } from '../parser/parse';

type Note = {
  message: string;
  level: 'error' | 'warning' | 'info';
  pos: Syntax.Pos,
};

function Note(
  el: Syntax.Element,
  level: 'error' | 'warning' | 'info',
  message: string
) {
  return {
    message,
    level,
    pos: el.p,
  };
}

export function validate(program: Syntax.Program): Note[] {
  const issues: Note[] = [];

  issues.push(...validateBody(program));

  issues.push(...traverse<Note>(program, el => {
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
  }));

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
  // TODO: Is := not an assignment operator?
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

function traverse<T>(
  element: Syntax.Element,
  process: (el: Syntax.Element) => T[],
): T[] {
  const results: T[] = [];

  results.push(...process(element));

  for (const child of Syntax.Children(element)) {
    results.push(...traverse(child, process));
  }

  return results;
}
