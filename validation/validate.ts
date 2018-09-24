import { Syntax } from '../parser/parse';

type Note = {
  message: string;
  level: 'error' | 'warning' | 'info';
  pos: Syntax.Pos,
};

export function validate(program: Syntax.Program): Note[] {
  return validateBlockBody(program);
}

function validateBlockBody(body: Syntax.Block): Note[] {
  const issues = ([] as Note[]).concat(...body.v.map(validateStatement));

  if (!body.v.some(statementHasReturn)) {
    issues.push({
      message: 'Body does not contain a return statement',
      level: 'error',
      pos: body.p,
    });
  }

  return issues;
}

function validateStatement(statement: Syntax.Statement): Note[] {
  const issues: Note[] = [];

  if (statement.t === 'e' && !isValidTopExpression(statement.v)) {
    issues.push({
      message: 'Statement has no effect',
      level: 'error',
      pos: statement.p,
    });
  }

  return issues;
}

function isValidTopExpression(e: Syntax.Expression) {
  // TODO: Is := not an assignment operator?
  if (Syntax.isAssignmentOperator(e.t) || e.t === ':=') {
    return true;
  }

  if (['func', 'class'].indexOf(e.t) !== -1) {
    return true;
  }

  return false;
}

function statementHasReturn(statement: Syntax.Statement): boolean {
  if (statement.t === 'return') {
    return true;
  }

  if (statement.t === 'if' || statement.t === 'for') {
    const [, body] = statement.v;
    return body.v.some(statementHasReturn);
  }

  return false;
}
