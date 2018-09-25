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
    switch (el.t) {
      case 'e': {
        // TODO: rename e -> expressionStatement?
        if (!isValidTopExpression(el.v)) {
          return [Note(el, 'error', 'Statement has no effect')];
        }

        return [];
      }

      case 'func': {
        const [, , body] = el.v;
        return body.t === 'block' ? validateBody(body) : [];
      }

      case 'for': {
        // TODO: Disallow shallow return unless continue might occur beforehand
        return [];
      }

      case 'class': {
        const methodBodies = el.v.methods.map(m => m.body);
        const classIssues = [];

        for (const body of methodBodies) {
          if (body.t === 'block') {
            // TODO: Allow methods to implicitly return this? Enforce return
            // consistency at least.
            classIssues.push(...validateBody(body));
          }
        }

        return classIssues;
      }

      case 'block': {
        let returned = false;
        const blockIssues = [];

        for (const statement of el.v) {
          if (returned) {
            blockIssues.push(
              Note(statement, 'error', 'Statement is unreachable')
            );
          }

          if (statement.t === 'return') {
            returned = true;
          }
        }

        return blockIssues;
      }

      default: return [];
    }
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
