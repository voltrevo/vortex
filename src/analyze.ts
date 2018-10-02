import Note from './Note';
import Scope from './Scope';
import Syntax from './parser/Syntax';

type Exception = {
  t: 'exception';
  v: {
    origin: Syntax.Element;
    message: string;
  };
};

function Exception(origin: Syntax.Element, message: string): Exception {
  return { t: 'exception', v: { origin, message } };
}

// TODO: Types start with capitals
type Value = (
  { t: 'string', v: string } |
  { t: 'number', v: number } |
  { t: 'bool', v: boolean } |
  { t: 'null', v: null } |
  { t: 'unknown', v: null } |
  { t: 'missing', v: null } |
  Exception |
  never
);

// TODO: Valid -> Concrete (?)
type ValidValue = (
  { t: 'string', v: string } |
  { t: 'number', v: number } |
  { t: 'bool', v: boolean } |
  { t: 'null', v: null } |
  never
);

const unknown = { t: 'unknown' as 'unknown', v: null };
const missing = { t: 'missing' as 'missing', v: null };

namespace Value {
  export function String(v: Value): string {
    switch (v.t) {
      case 'string': return JSON.stringify(v.v);
      case 'number': return v.v.toString();
      case 'bool': return v.v.toString();
      case 'null': return 'null';
      case 'unknown': return '<unknown>';
      case 'missing': return '<missing>';
      case 'exception': return `<exception: ${v.v.message}>`;
    }
  }

  export function getValidOrNull(v: Value): ValidValue | null {
    switch (v.t) {
      case 'string':
      case 'number':
      case 'bool':
      case 'null':
        return v;

      case 'unknown':
      case 'missing':
      case 'exception':
        return null;
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

export default function analyze(program: Syntax.Program) {
  let context = Context();

  context = analyzeInContext(context, program);

  if (context.value.t === 'missing') {
    context.notes.push(Note(program, 'error',
      `Returned ${Value.String(context.value)}`,
    ));
  }

  return context;
}

function analyzeInContext(
  context: Context,
  program: Syntax.Program
): Context {
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

          if (value.t === 'missing') {
            context.value = Exception(
              statement.v,
              `Return expression was ${Value.String(value)}`,
            );
          } else if (value.t !== 'exception') {
            context.notes.push(Note(statement, 'info',
              `Returned ${Value.String(value)}`,
            ));
          }

          return null;
        }

        case 'assert': {
          // TODO: Disallow scope mutations
          const { scope, value, notes } = evalExpression(
            context.scope,
            statement.v
          );

          context.scope = scope;
          context.notes.push(...notes);

          const validValue = Value.getValidOrNull(value);

          if (!validValue) {
            return null;
          }

          if (validValue.t !== 'bool') {
            context.notes.push(Note(statement.v, 'error',
              `Type error: assert ${validValue.t}`,
            ));
          } else if (validValue.v !== true) {
            // TODO: Format code for other exceptions like this
            context.value = Exception(statement.v,
              // TODO: Show detail
              `Asserted ${ExpressionString(context.scope, statement.v)}`,
            );
          }

          return null;
        }

        case 'if': {
          const [cond, block] = statement.v;
          const condCtx = evalExpression(context.scope, cond);
          context.notes.push(...condCtx.notes);

          const validCond = Value.getValidOrNull(condCtx.value);

          if (!validCond) {
            // TODO: unknown should be handled differently
            context.value = Exception(cond,
              `Didn't get a valid condition: ${Value.String(condCtx.value)}`,
            );

            return null;
          }

          if (validCond.t === 'bool') {
            if (validCond.v) {
              context.scope = { parent: context.scope, variables: {} };
              context = analyzeInContext(context, block);

              if (context.scope.parent === null) {
                throw new Error('This should not be possible');
              }

              context.scope = context.scope.parent;
            }
          } else {
            context.value = Exception(cond,
              `Type error: Non-bool condition: ${validCond.t}`,
            );
          }

          return null;
        }

        case 'for': {
          const { control, block } = statement.v;

          if (
            control !== null &&
            control.t !== 'condition' &&
            control.t !== 'setup; condition; next'
          ) {
            context.value = Exception(
              statement,
              // TODO: Need to capture more structure in compiler notes
              `Not implemented: for loop with (${control.t}) control clause`,
            );

            return null;
          }

          const cond: Syntax.Expression = (() => {
            if (control === null) {
              return {
                t: 'BOOL' as 'BOOL',
                v: true,
                p: {
                  first_line: 0,
                  last_line: 0,
                  first_column: 0,
                  last_column: 0,
                },
              };
            }

            switch (control.t) {
              case 'condition': { return control.v; }
              case 'setup; condition; next': { return control.v[1]; }
            }
          })();

          context.scope = Scope.push(context.scope);

          if (control && control.t === 'setup; condition; next') {
            const [setup] = control.v;
            const setupCtx = evalExpression(context.scope, setup);
            context.scope = setupCtx.scope;
            context.notes.push(...setupCtx.notes);
          }

          let iterations = 0;

          while (true) {
            const condCtx = evalExpression(context.scope, cond);

            // TODO: Note counting, deduplication with if

            context.notes.push(...condCtx.notes);

            const validCond = Value.getValidOrNull(condCtx.value);

            if (!validCond) {
              // TODO: unknown should be handled differently
              context.value = Exception(cond,
                `Didn't get a valid condition: ${Value.String(condCtx.value)}`,
              );

              break;
            }

            if (validCond.t !== 'bool') {
              context.value = Exception(
                cond,
                `Type error: Non-bool condition: ${validCond.t}`,
              );

              break;
            }

            if (validCond.v === false) {
              break;
            }

            context.scope = Scope.push(context.scope);
            context = analyzeInContext(context, block);

            if (control && control.t === 'setup; condition; next') {
              const [, , next] = control.v;
              const nextCtx = evalExpression(context.scope, next);
              context.scope = nextCtx.scope;
              context.notes.push(...nextCtx.notes);
            }

            if (context.scope.parent === null) {
              // This is one of those cases that vortex will hopefully not need
              // this (since you can know context.scope is currently a
              // ScopeWithParent)
              throw new Error('This should not be possible');
            }

            context.scope = context.scope.parent;

            iterations++;

            if (context.value.t !== 'missing') {
              break;
            }

            if (iterations >= 2048) {
              // TODO: Count total operations and limit execution based on that
              // instead.
              context.notes.push(Note(statement, 'warning',
                'Hit iteration limit of 2048',
              ));

              context.value = unknown;
              break;
            }
          }

          const innerScope = context.scope.parent;

          if (innerScope === null) {
            throw new Error('This should not be possible');
          }

          // TODO: It would be better to use Scope.pop here but it's difficult
          // due to typescript limitations.
          context.scope = innerScope;

          return null;
        }

        case 'break':
        case 'continue':
        case 'import': {
          context.value = Exception(
            statement,
            // TODO: Need to capture more structure in compiler notes
            `Not implemented: ${statement.t} statement`,
          );

          return null;
        }
      }
    })());

    if (context.value.t !== 'missing') {
      break;
    }
  }

  const finalNotes: Note[] = (() => {
    switch (context.value.t) {
      case 'exception':
        return [Note(context.value.v.origin, 'error',
          `Threw exception: ${context.value.v.message}`,
        )];

      case 'missing':
      case 'unknown':
      case 'string':
      case 'number':
      case 'bool':
      case 'null':
        return [];
    }
  })();

  context.notes.push(...finalNotes);

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

      case 'BOOL': {
        value = { t: 'bool', v: exp.v };
        return null;
      }

      case 'NULL': {
        value = { t: 'null', v: exp.v };
        return null;
      }

      case 'STRING': {
        value = { t: 'string', v: exp.v.substring(1, exp.v.length - 1) };
        return null;
      }

      case 'IDENTIFIER': {
        const entry = Scope.get(scope, exp.v);

        if (entry === null) {
          value = Exception(exp, `Variable does not exist: ${exp.v}`);
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
          value = Exception(
            left,
            'Not implemented: non-identifier lvalues',
          );

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

      // TODO: Support more compound assignment operators
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
      case '|=': {
        const left = exp.v[0];

        const rightExp: Syntax.Expression = (() => {
          // The need for the type annotation below is a particularly strange
          // quirk of typescript - without it, synthOp is a string when
          // included in the return object even though it correctly deduces the
          // more accurate type when hovering on synthOp.
          const synthOp: Syntax.NonSpecialBinaryOperator | null = (() => {
            switch (exp.t) {
              case '=': return null;
              case '+=': return '+';
              case '-=': return '-';
              case '*=': return '*';
              case '/=': return '/';
              case '%=': return '%';
              case '<<=': return '<<';
              case '>>=': return '>>';
              case '&=': return '&';
              case '^=': return '^';
              case '|=': return '|';
            }
          })();

          if (synthOp === null) {
            return exp.v[1];
          }

          return {
            t: synthOp,
            v: exp.v,
            p: exp.p,
          };
        })();

        const right = evalExpression(scope, rightExp);
        notes.push(...right.notes);

        if (left.t !== 'IDENTIFIER') {
          value = Exception(
            left,
            'Not implemented: non-identifier lvalues',
          );

          return null;
        }

        const existing = Scope.get<Context>(scope, left.v);

        if (!existing) {
          notes.push(Note(exp, 'error',
            'Attempt to assign to a variable that does not exist',
          ));

          return null;
        }

        // TODO: Should the scope data really be Context? Not seeming
        // appropriate here. (What's the purpose of scope, notes?)
        scope = Scope.set<Context>(scope, left.v, { value: right.value });

        return null;
      }

      case 'prefix --':
      case 'postfix --':
      case 'prefix ++':
      case 'postfix ++': {
        const fixType: 'pre' | 'post' = (
          exp.t.indexOf('prefix') === 0 ?
          'pre' :
          'post'
        );

        const incDec: 'inc' | 'dec' = (
          exp.t.indexOf('++') !== -1 ?
          'inc' :
          'dec'
        );

        const subExp = exp.v;

        const subExpCtx = evalExpression(scope, subExp);
        scope = subExpCtx.scope;
        notes.push(...subExpCtx.notes);

        const validValue = Value.getValidOrNull(subExpCtx.value);

        if (validValue && validValue.t !== 'number') {
          const opStr: string = (() => {
            switch (incDec) {
              case 'inc': return '++';
              case 'dec': return '--';
            }
          })();

          const typeExpStr: string = (() => {
            switch (fixType) {
              case 'pre': return `${opStr}${validValue.t}`;
              case 'post': return `${validValue.t}${opStr}`;
            }
          })();

          notes.push(Note(exp, 'error',
            `Type error: ${typeExpStr}`
          ));

          value = unknown;
        }

        if (subExp.t !== 'IDENTIFIER') {
          value = Exception(
            exp,
            `Not implemented: non-identifier lvalues`,
          );

          return null;
        }

        if (
          validValue &&
          validValue.t === 'number'
        ) {
          const newValue = {
            t: 'number' as 'number',
            v: (
              incDec === 'inc' ?
              validValue.v + 1 :
              validValue.v - 1
            )
          };

          scope = Scope.set(scope, subExp.v, { value: newValue });
          value = fixType === 'pre' ? newValue : validValue;
        }

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

      // Number only operators (for now)
      case '-':
      case '<<':
      case '>>':
      case '&':
      case '^':
      case '|':
      case '/':
      case '%':
      case '**': {
        const op: (a: number, b: number) => number = (() => {
          switch (exp.t) {
            case '-': return (a: number, b: number) => a - b;
            case '<<': return (a: number, b: number) => a << b;
            case '>>': return (a: number, b: number) => a >> b;
            case '&': return (a: number, b: number) => a & b;
            case '^': return (a: number, b: number) => a ^ b;
            case '|': return (a: number, b: number) => a | b;
            case '/': return (a: number, b: number) => a / b;
            case '%': return (a: number, b: number) => a % b;
            case '**': return (a: number, b: number) => a ** b;
          }
        })();

        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return { t: 'number', v: op(left.v, right.v) };
            }

            return null;
          },
        ));

        return null;
      }

      case '&&':
      case '||': {
        const op: (a: boolean, b: boolean) => boolean = (() => {
          switch (exp.t) {
            case '&&': return (a: boolean, b: boolean) => a && b;
            case '||': return (a: boolean, b: boolean) => a || b;
          }
        })();

        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'bool' && right.t === 'bool') {
              return { t: 'bool', v: op(left.v, right.v) };
            }

            return null;
          },
        ));

        return null;
      }

      case '==':
      case '!=': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t !== right.t) {
              // ==, != require types to match
              return null;
            }

            return {
              t: 'bool',
              v: exp.t === '==' ? left.v === right.v : left.v !== right.v,
            };
          },
        ));

        return null;
      }

      case '<=':
      case '>=':
      case '<':
      case '>': {
        type V = string | number | boolean;
        const op: (a: V, b: V) => boolean = (() => {
          switch (exp.t) {
            case '<=': return (a: V, b: V) => a <= b;
            case '>=': return (a: V, b: V) => a >= b;
            case '<': return (a: V, b: V) => a < b;
            case '>': return (a: V, b: V) => a > b;
          }
        })();

        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t !== right.t) {
              // ==, != require types to match
              return null;
            }

            const v = (
              // Special case: typescript doesn't allow comparison with nulls,
              // but we want to allow it when both sides are null
              left.t === 'null' || right.t === 'null' ?
              op(left.v as any, right.v as any) :
              op(left.v, right.v)
            );

            return { t: 'bool', v };
          },
        ));

        return null;
      }

      case 'unary -':
      case 'unary +': {
        const right = evalExpression(scope, exp.v);
        notes.push(...right.notes);
        const validValue = Value.getValidOrNull(right.value);

        if (!validValue) {
          value = right.value;
          return null;
        }

        if (validValue.t === 'number') {
          value = {
            t: 'number',
            v: (
              exp.t === 'unary -' ?
              -validValue.v :
              +validValue.v
            )
          };

          return null;
        }

        value = Exception(
          exp,
          `Type error: ${exp.t.slice(6)}${right.value.t}`,
        );

        return null;
      }

      case '.':
      case 'functionCall':
      case 'methodCall':
      case 'subscript':
      case 'func':
      case 'array':
      case 'object':
      case 'class':
      case 'switch':
      case 'import': {
        value = Exception(
          exp,
          `Not implemented: ${exp.t} expression`,
        );

        return null;
      }
    }
  })());

  return { scope, value, notes };
}

function evalVanillaOperator<T extends {
  t: Syntax.NonSpecialBinaryOperator,
  v: [Syntax.Expression, Syntax.Expression],
  p: Syntax.Pos
}>(
  { scope }: Context,
  exp: T,
  combine: (a: ValidValue, b: ValidValue) => Value | null,
): Context {
  let notes = [] as Note[];

  const left = evalExpression(scope, exp.v[0]);
  scope = left.scope;
  notes.push(...left.notes);
  const validLeft = Value.getValidOrNull(left.value);

  if (!validLeft) {
    return { scope, value: left.value, notes };
  }

  const right = evalExpression(scope, exp.v[1]);
  scope = right.scope;
  notes.push(...right.notes);
  const validRight = Value.getValidOrNull(right.value);

  if (!validRight) {
    return { scope, value: right.value, notes };
  }

  let value = combine(validLeft, validRight);

  if (value === null) {
    // TODO: Combine should return something more informative than null to
    // indicate that a type error should result.
    value = Exception(
      exp,
      `Type error: ${left.value.t} ${exp.t} ${right.value.t}`,
    );
  }

  return { scope, value, notes };
}

function ExpressionString(
  scope: Scope<Context>,
  exp: Syntax.Expression
): string {
  switch (exp.t) {
    case 'IDENTIFIER':
    case 'NUMBER':
    case 'STRING':
    case 'BOOL':
    case 'NULL':
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
    case 'unary -':
    case 'unary +':
    case 'prefix --':
    case 'prefix ++':
    case 'postfix --':
    case 'postfix ++': {
      const ctx = evalExpression(scope, exp);
      return Value.String(ctx.value);
    }

    default: {
      const [left, right] = exp.v;
      return [
        '(',
        ExpressionString(scope, left),
        ` ${exp.t} `,
        ExpressionString(scope, right),
        ')'
      ].join('');
    }
  }
}

function checkNull(ignored: null) {}
