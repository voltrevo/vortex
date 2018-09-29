import Note from './Note';
import Scope from './Scope';
import { Syntax } from './parser/parse';

type Value = (
  { t: 'string', v: string } |
  { t: 'number', v: number } |
  { t: 'unknown' } |
  { t: 'missing' } |
  never
);

namespace Value {
  export function String(v: Value): string {
    switch (v.t) {
      case 'string': return JSON.stringify(v.v);
      case 'number': return v.v.toString();
      case 'unknown': return '<unknown>';
      case 'missing': return '<missing>';
    }
  }
}

type ValuePlus = {
  value: Value;
  notes: Note[];
};

type VInfo = {
  value: ValuePlus;
};

export default function interpret(program: Syntax.Program): ValuePlus {
  let scope = Scope<VInfo>();

  let result: ValuePlus = {
    value: { t: 'missing' },
    notes: [],
  };

  for (const statement of program.v) {
    checkNull((() => {
      // Typescript limitation: value has type `any` below
      // ... I think this is kindof ok, but it's confusing, generally you
      // want to avoid the possibility of `any`.
      let value = null;

      switch (statement.t) {
        case 'e': {
          ({ scope } = evalExpression(scope, statement.v));
          return null;
        }

        case 'return': {
          ({ scope, value } = evalExpression(scope, statement.v));

          value.notes.push(Note(
            statement,
            value.value.t === 'missing' ? 'error' : 'info',
            `Returned ${Value.String(value.value)}`,
          ));

          result.value = value.value;
          result.notes.push(...value.notes);

          return null;
        }

        case 'break':
        case 'continue':
        case 'if':
        case 'for':
        case 'import': {
          result.notes.push(Note(statement, 'warning',
            // TODO: Need to capture more structure in compiler notes
            `Not implemented: ${statement.t} statement`,
          ));

          return null;
        }
      }
    })());

    if (result.value !== null) {
      return result;
    }
  }

  return result;
}

function evalExpression(
  scope: Scope<VInfo>,
  exp: Syntax.Expression
): { scope: Scope<VInfo>, value: ValuePlus } {
  let value: ValuePlus = {
    value: {
      t: 'missing'
    },
    notes: [],
  };

  checkNull((() => {
    let left = null;
    let right = null;

    switch (exp.t) {
      case 'NUMBER': {
        value.value = { t: 'number', v: Number(exp.v) };
        return null;
      }

      case '+': {
        ({ scope, value: left } = evalExpression(scope, exp.v[0]));
        ({ scope, value: right } = evalExpression(scope, exp.v[1]));

        value.notes.push(...left.notes, ...right.notes);

        if (left.value.t === 'missing' || right.value.t === 'missing') {
          value.value = { t: 'missing' };
          return null;
        }

        if (left.value.t === 'number' && right.value.t === 'number') {
          value.value = { t: 'number', v: left.value.v + right.value.v };
          return null;
        }

        if (left.value.t !== right.value.t) {
          value.value = { t: 'missing' };

          value.notes.push(Note(exp, 'error',
            `Type mismatch: ${left.value.t} + ${right.value.t}`,
          ));

          return null;
        }

        value.value = { t: 'missing' };

        value.notes.push(Note(exp, 'error',
          `Not implemented: ${left.value.t} + ${right.value.t}`,
        ));

        return null;
      }

      case ':=':
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
      case '=':
      case '**':
      case '<<':
      case '>>':
      case '<=':
      case '>=':
      case '==':
      case '!=':
      case '&&':
      case '||':
      case '*':
      case '/':
      case '%':
      case '-':
      case '<':
      case '>':
      case '&':
      case '^':
      case '|':
      case 'prefix --':
      case 'postfix --':
      case 'prefix ++':
      case 'postfix ++':
      case 'unary -':
      case 'unary +':
      case 'IDENTIFIER':
      case 'STRING':
      case '.':
      case 'functionCall':
      case 'methodCall':
      case 'subscript':
      case 'func':
      case 'array':
      case 'object':
      case 'class':
      case 'switch':
      case 'import':
        value.notes.push(Note(exp, 'warning',
          `Not implemented: ${exp.t} expression`,
        ));

        return null;
    }
  })());

  return { scope, value };
}

function checkNull(ignored: null) {}
