import Note from './Note';
import Scope from './Scope';
import { Syntax } from './parser/parse';

type Value = (
  { t: 'string', v: string } |
  { t: 'number', v: number } |
  { t: 'unknown', v: null } |
  { t: 'missing', v: null } |
  never
);

// const unknown = { t: 'unknown' as 'unknown', v: null };
const missing = { t: 'missing' as 'missing', v: null };

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

type Context = {
  scope: Scope<Context>;
  value: Value;
  notes: Note[];
};

function Context(): Context {
  return {
    scope: Scope<Context>(),
    value: missing,
    notes: [],
  };
}

export default function interpret(program: Syntax.Program): Context {
  let context = Context();

  for (const statement of program.v) {
    checkNull((() => {
      switch (statement.t) {
        case 'e': {
          const ctx = evalExpression(context.scope, statement.v);
          context.scope = ctx.scope;
          context.notes.push(...ctx.notes);
          return null;
        }

        case 'return': {
          const { scope, value, notes } = evalExpression(
            context.scope,
            statement.v
          );

          context.scope = scope;
          context.value = value;
          context.notes.push(...notes);

          context.notes.push(Note(
            statement,
            value.t === 'missing' ? 'error' : 'info',
            `Returned ${Value.String(value)}`,
          ));

          return null;
        }

        case 'break':
        case 'continue':
        case 'if':
        case 'for':
        case 'import': {
          context.notes.push(Note(statement, 'warning',
            // TODO: Need to capture more structure in compiler notes
            `Not implemented: ${statement.t} statement`,
          ));

          return null;
        }
      }
    })());

    if (statement.t === 'return') {
      return context;
    }
  }

  return context;
}

function evalExpression(
  scope: Scope<Context>,
  exp: Syntax.Expression
): Context {
  let { value, notes } = Context();

  checkNull((() => {
    switch (exp.t) {
      case 'NUMBER': {
        value = { t: 'number', v: Number(exp.v) };
        return null;
      }

      case 'STRING': {
        value = { t: 'string', v: exp.v.substring(1, exp.v.length - 1) };
        return null;
      }

      case 'IDENTIFIER': {
        const entry = Scope.get(scope, exp.v);

        if (entry === null) {
          value = missing;
          return null;
        }

        value = entry.data.value;
        return null;
      }

      case ':=': {
        const left = exp.v[0];

        const right = evalExpression(scope, exp.v[1]);
        notes.push(...right.notes);

        if (left.t !== 'IDENTIFIER') {
          notes.push(Note(exp, 'error',
            'NotImplemented: non-identifier lvalues'
          ));

          return null;
        }

        scope = Scope.add<Context>(scope, left.v, {
          origin: left,
          data: {
            scope,
            value: right.value,
            notes: [],
          },
        });

        return null;
      }

      case '+': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: left.v + right.v };
            }

            if (left.t === 'string' && right.t === 'string') {
              return { t: 'string', v: left.v + right.v };
            }

            return null;
          },
        ));

        return null;
      }

      case '-': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: left.v - right.v };
            }

            return null;
          },
        ));

        return null;
      }

      case '*': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: left.v * right.v };
            }

            // TODO: Implement generic version of this which just requires
            // non-number type to have a + operator
            // TODO: Possibly configure limit for this behaviour during
            // analysis?
            if (left.t === 'string' && right.t === 'number') {
              return { t: 'string', v: left.v.repeat(right.v) };
            }

            if (left.t === 'number' && right.t === 'string') {
              return { t: 'string', v: right.v.repeat(left.v) };
            }

            return null;
          },
        ));

        return null;
      }

      case '/': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: left.v / right.v };
            }

            return null;
          },
        ));

        return null;
      }

      case '%': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: left.v % right.v };
            }

            return null;
          },
        ));

        return null;
      }

      case '**': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: left.v ** right.v };
            }

            return null;
          },
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
      case '<<':
      case '>>':
      case '<=':
      case '>=':
      case '==':
      case '!=':
      case '&&':
      case '||':
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
        notes.push(Note(exp, 'warning',
          `Not implemented: ${exp.t} expression`,
        ));

        return null;
    }
  })());

  return { scope, value, notes };
}

function evalVanillaOperator<T extends {
  t: string,
  v: [Syntax.Expression, Syntax.Expression],
  p: Syntax.Pos
}>(
  { scope }: Context,
  exp: T,
  combine: (a: Value, b: Value) => Value | null,
): Context {
  let value: Value | null = missing;
  let notes = [] as Note[];

  const left = evalExpression(scope, exp.v[0]);
  scope = left.scope;
  const right = evalExpression(scope, exp.v[1]);
  scope = right.scope;

  notes.push(...left.notes, ...right.notes);

  if (left.value.t === 'missing' || right.value.t === 'missing') {
    value = missing;
    return { scope, value, notes };
  }

  value = combine(left.value, right.value);

  if (value === null) {
    notes.push(Note(exp, 'error',
      `Type mismatch: ${left.value.t} ${exp.t} ${right.value.t}`,
    ));

    value = missing;
  }

  return { scope, value, notes };
}

function checkNull(ignored: null) {}
