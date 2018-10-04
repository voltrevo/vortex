import checkNull from './checkNull';
import Note from './Note';
import Scope from './Scope';
import Syntax from './parser/Syntax';

// TODO: Types start with capitals
// (primitive types can be lowercase?)
export type VString = { t: 'string', v: string };
export type VNumber = { t: 'number', v: number };
export type VBool = { t: 'bool', v: boolean };
export type VNull = { t: 'null', v: null };
export type VFunc = Syntax.FunctionExpression;
export type VArray = { t: 'array', v: ValidValue[] };
export type VObject = { t: 'object', v: { [key: string]: ValidValue } };
export type VUnknown = { t: 'unknown', v: null };
export type VMissing = { t: 'missing', v: null };

export type VException = {
  t: 'exception';
  v: {
    origin: Syntax.Element;
    message: string;
  };
}

function VException(origin: Syntax.Element, message: string): VException {
  return { t: 'exception', v: { origin, message } };
}

// TODO: Valid -> Concrete (?)
type ValidValue = (
  VString |
  VNumber |
  VBool |
  VNull |
  VFunc |
  VArray |
  VObject |
  never
);

function SameType(left: ValidValue, right: ValidValue): boolean | null {
  switch (left.t) {
    case 'func': {
      if (right.t !== 'func') {
        return false;
      }

      // TODO: Types of arguments?
      return left.v.args.length === right.v.args.length;
    }

    case 'array': {
      if (right.t !== 'array') {
        return false;
      }

      for (let i = 0; i < left.v.length; i++) {
        const subSameType = SameType(left.v[i], right.v[i]);

        if (subSameType === null) {
          return null;
        }

        if (!subSameType) {
          return false;
        }
      }

      return true;
    }

    case 'object': {
      if (right.t !== 'object') {
        return false;
      }

      const leftKeys = Object.keys(left.v).sort();
      const rightKeys = Object.keys(right.v).sort();

      if (leftKeys.length !== rightKeys.length) {
        return false;
      }

      for (let i = 0; i < leftKeys.length; i++) {
        const subSameType = SameType(
          left.v[leftKeys[i]],
          right.v[rightKeys[i]],
        )

        if (subSameType === null) {
          return null;
        }

        if (!subSameType) {
          return false;
        }

        return true;
      }

      return true;
    }

    case 'string':
    case 'number':
    case 'bool':
    case 'null': {
      return left.t === right.t;
    }
  }
}

function TypedEqual(left: ValidValue, right: ValidValue): boolean | null {
  if (!SameType(left, right)) {
    return null;
  }

  switch (left.t) {
    case 'string':
    case 'number':
    case 'bool':
    case 'null': {
      return left.v === right.v;
    }

    case 'func': {
      // Not defining a way to compare functions right now. In general, it's
      // impossible to tell whether functions behave the same way, so there
      // will have to be null sometimes.
      // In general, perhaps the syntax trees of the optimised functions can
      // be compared, true if the same, but still null rather than false if
      // different.
      throw new Error('Shouldn\'t be possible, but may be later');
      // return null;
    }

    case 'array': {
      if (right.t !== 'array') {
        throw new Error('Shouldn\'t be possible');
      }

      for (let i = 0; i < left.v.length; i++) {
        const subEq = TypedEqual(left.v[i], right.v[i]);

        if (subEq === null) {
          throw new Error('Shouldn\'t be possible right now');
          // return null;
        }

        if (!subEq) {
          return false;
        }
      }

      return true;
    }

    case 'object': {
      if (right.t !== 'object') {
        throw new Error('Shouldn\'t be possible');
      }

      // Already checked types are equal so we know that the left keys are also
      // the right keys.
      const keys = Object.keys(left.v).sort();

      for (const key of keys) {
        const subEq = TypedEqual(left.v[key], right.v[key]);

        if (subEq === null) {
          throw new Error('Shouldn\'t be possible right now');
          // return null;
        }

        if (!subEq) {
          return false;
        }
      }

      return true;
    }
  }
}

function TypedLessThan(left: ValidValue, right: ValidValue): boolean | null {
  if (!SameType(left, right)) {
    return null;
  }

  switch (left.t) {
    case 'string':
    case 'number':
    case 'bool':
    case 'null': {
      // Need to use any here because typescript thinks null comparison is bad
      // but we're ok with it and it does the right thing.
      return (left.v as any) < (right.v as any);
    }

    case 'func': {
      // Not defining a way to compare functions right now.
      return null;
    }

    case 'array': {
      if (right.t !== 'array') {
        throw new Error('Shouldn\'t be possible');
      }

      for (let i = 0; i < left.v.length; i++) {
        const subLT = TypedLessThan(left.v[i], right.v[i]);

        if (subLT === null) {
          throw new Error('Shouldn\'t be possible right now');
          // return null;
        }

        if (subLT) {
          return true;
        }

        const subGT = TypedLessThan(right.v[i], left.v[i]);

        if (subGT === null) {
          throw new Error('Shouldn\'t be possible');
        }

        if (subGT) {
          return false;
        }
      }

      return false;
    }

    case 'object': {
      if (right.t !== 'object') {
        throw new Error('Shouldn\'t be possible');
      }

      // Already checked types are equal so we know that the left keys are also
      // the right keys.
      const keys = Object.keys(left.v).sort();

      // TODO: Deduplicate with arrays
      for (const key of keys) {
        const subLT = TypedLessThan(left.v[key], right.v[key]);

        if (subLT === null) {
          throw new Error('Shouldn\'t be possible right now');
          // return null;
        }

        if (subLT) {
          return true;
        }

        const subGT = TypedLessThan(right.v[key], left.v[key]);

        if (subGT === null) {
          throw new Error('Shouldn\'t be possible');
        }

        if (subGT) {
          return false;
        }
      }

      return false;
    }
  }
}

function InvertNonNull(x: boolean | null): boolean | null {
  if (x === null) {
    return null;
  }

  return !x;
}

type ComparisonOp = '==' | '!=' | '<' | '>' | '<=' | '>=';

function TypedComparison(
  op: ComparisonOp,
  left: ValidValue,
  right: ValidValue,
): boolean | null {
  switch (op) {
    case '==': return TypedEqual(left, right);
    case '!=': return InvertNonNull(TypedEqual(left, right));
    case '<': return TypedLessThan(left, right);
    case '>': return TypedLessThan(right, left);
    case '<=': return InvertNonNull(TypedLessThan(right, left));
    case '>=': return InvertNonNull(TypedLessThan(left, right));
  }
}

function TypedComparisonValue(
  op: ComparisonOp,
  left: ValidValue,
  right: ValidValue,
): ValidValue | null {
  const cmp = TypedComparison(op, left, right);

  if (cmp === null) {
    return null;
  }

  return { t: 'bool', v: cmp };
}

function SynthExpFromValidValue(
  value: ValidValue,
  p: Syntax.Pos,
): Syntax.Expression {
  switch (value.t) {
    case 'string': return { t: 'STRING', v: JSON.stringify(value.v), p };
    case 'number': return { t: 'NUMBER', v: JSON.stringify(value.v), p };
    case 'bool': return { t: 'BOOL', v: value.v, p };
    case 'null': return { t: 'NULL', v: value.v, p };
    case 'func': return value;

    case 'array': return {
      t: 'array',
      v: value.v.map(v => SynthExpFromValidValue(v, p)),
      p,
    };

    case 'object': return {
      t: 'object',
      v: Object.keys(value.v).sort().map(key => [
        { t: 'IDENTIFIER', v: key, p },
        SynthExpFromValidValue(value.v[key], p)
      ] as [Syntax.Identifier, Syntax.Expression]),
      p,
    }
  }
}

type InvalidValue = (
  VUnknown |
  VMissing |
  VException |
  never
);

type Value = (
  ValidValue |
  InvalidValue |
  never
);

type ValidInvalidValue = (
  { t: 'valid', v: ValidValue } |
  { t: 'invalid', v: InvalidValue } |
  never
);

function ValidInvalidValue(v: Value): ValidInvalidValue {
  switch (v.t) {
    case 'string':
    case 'number':
    case 'bool':
    case 'null':
    case 'func':
    case 'array':
    case 'object':
      return { t: 'valid', v };

    case 'unknown':
    case 'missing':
    case 'exception':
      return { t: 'invalid', v };
  }
}

const unknown: VUnknown = { t: 'unknown', v: null };
const missing: VMissing = { t: 'missing', v: null };

namespace Value {
  export function String(v: Value): string {
    switch (v.t) {
      case 'string': return JSON.stringify(v.v);
      case 'number': return v.v.toString();
      case 'bool': return v.v.toString();
      case 'null': return 'null';

      // TODO: include argument names
      case 'func': return `<func ${v.v.name ? v.v.name.v : '(anonymous)'}>`;

      case 'array': return `[${v.v.map(Value.String).join(', ')}]`;

      case 'object': return `{${
        Object.keys(v.v).sort().map(key => (
          // TODO: In future keys can be non-identifiers and will need to be
          // quoted
          `${key}: ${Value.String(v.v[key])}`
        )).join(', ')
      }}`;

      case 'unknown': return '<unknown>';
      case 'missing': return '<missing>';
      case 'exception': return `<exception: ${v.v.message}>`;
    }
  }

  export function getValidOrNull(v: Value): ValidValue | null {
    const vinvValue = ValidInvalidValue(v);

    if (vinvValue.t === 'valid') {
      return vinvValue.v;
    }

    return null;
  }
}

function stringMul(s: VString, n: VNumber): VString {
  // TODO: Check n is an appropriate number (wait for integer implementation?)
  return { t: 'string', v: s.v.repeat(n.v) };
}

function arrayMul(a: VArray, n: VNumber): VArray {
  // TODO: Check n is an appropriate number (wait for integer implementation?)

  const res: VArray = { t: 'array', v: [] };

  for (let i = 0; i < n.v; i++) {
    res.v.push(...a.v);
  }

  return res;
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

  context = analyzeInContext(context, true, program);

  return context;
}

function analyzeInContext(
  context: Context,
  needsValue: boolean,
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
            context.value = VException(
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

          const vinvValue = ValidInvalidValue(value);

          if (vinvValue.t === 'invalid') {
            const invalidValue = vinvValue.v;

            context.value = (() => {
              switch (invalidValue.t) {
                case 'unknown':
                case 'exception':
                  return invalidValue;

                case 'missing':
                  // TODO: Is this actually possible? I think evalExpression
                  // can't actually produce <missing> anymore.
                  return VException(statement.v,
                    'Assertion expression is missing a value',
                  );
              }
            })();

            return null;
          }

          const validValue = vinvValue.v;

          if (validValue.t !== 'bool') {
            context.notes.push(Note(statement.v, 'error',
              `Type error: assert ${validValue.t}`,
            ));
          } else if (validValue.v !== true) {
            // TODO: Format code for other exceptions like this
            context.value = VException(statement.v,
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
            context.value = VException(cond,
              `Didn't get a valid condition: ${Value.String(condCtx.value)}`,
            );

            return null;
          }

          if (validCond.t === 'bool') {
            if (validCond.v) {
              context.scope = { parent: context.scope, variables: {} };
              context = analyzeInContext(context, false, block);

              if (context.scope.parent === null) {
                throw new Error('This should not be possible');
              }

              context.scope = context.scope.parent;
            }
          } else {
            context.value = VException(cond,
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
            context.value = VException(
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
              context.value = VException(cond,
                `Didn't get a valid condition: ${Value.String(condCtx.value)}`,
              );

              break;
            }

            if (validCond.t !== 'bool') {
              context.value = VException(
                cond,
                `Type error: Non-bool condition: ${validCond.t}`,
              );

              break;
            }

            if (validCond.v === false) {
              break;
            }

            context.scope = Scope.push(context.scope);
            context = analyzeInContext(context, false, block);

            if (context.value.t !== 'exception') {
              if (control && control.t === 'setup; condition; next') {
                const [, , next] = control.v;
                const nextCtx = evalExpression(context.scope, next);
                context.scope = nextCtx.scope;
                context.notes.push(...nextCtx.notes);
              }
            }

            if (context.scope.parent === null) {
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
          context.value = VException(
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
        // Exception should be picked up and result in a note elsewhere if
        // we're not returning a value.
        if (needsValue) {
          return [Note(context.value.v.origin, 'error',
            `Threw exception: ${context.value.v.message}`,
          )];
        }

        return [];

      case 'missing': {
        if (needsValue) {
          return [Note(program, 'error',
            `Returned ${Value.String(context.value)}`,
          )];
        }

        return [];
      }

      case 'unknown':
      case 'string':
      case 'number':
      case 'bool':
      case 'null':
      case 'func':
      case 'array':
      case 'object':
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
          value = VException(exp, `Variable does not exist: ${exp.v}`);
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
          value = VException(
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
      // TODO: Better lvalues - preserve identifiers during eval
      // e.g. this will enable: [a, b][getIndex()] = 1;
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
        const leftExp = exp.v[0];

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
        scope = right.scope;
        notes.push(...right.notes);

        if (right.value.t === 'exception') {
          value = right.value;
          return null;
        }

        if (leftExp.t === 'array') {
          // TODO: Fail earlier / in a more informative way when attempting a
          // destructuring and compound assignment simultaneously?

          if (right.value.t !== 'array') {
            value = VException(exp,
              // TODO: a vs an
              'Assignment target is an array but the value is a ' +
              right.value.t
            );

            return null;
          }

          if (leftExp.v.length !== right.value.v.length) {
            // TODO: Implement _ as special ignore identifier
            value = VException(exp, [
              'Array destructuring length mismatch: ',
              leftExp.v.length,
              ' targets but only ',
              right.value.v.length,
              ' values',
            ].join(''));

            return null;
          }

          for (let i = 0; i < leftExp.v.length; i++) {
            const subLeft = leftExp.v[i];

            // Need to use evaluated rhs rather than decomposing into
            // assignments so that e.g. [a, b] = [b, a] works rather than
            // producing a = b; b = a; which doesn't swap.
            const synthSubRight = SynthExpFromValidValue(
              right.value.v[i],
              rightExp.p,
            );

            const synthExp = {
              t: '=' as '=',
              v: [
                subLeft,
                synthSubRight,
              ] as [Syntax.Expression, Syntax.Expression],
              p: exp.p,
            };

            const subCtx = evalExpression(scope, synthExp);
            scope = subCtx.scope;
            notes.push(...subCtx.notes);

            if (subCtx.value.t === 'exception') {
              value = subCtx.value;
              return null;
            }
          }

          return null;
        }

        if (leftExp.t !== 'IDENTIFIER') {
          value = VException(
            leftExp,
            `Invalid assignment expression: ${leftExp.t}`,
          );

          return null;
        }

        const existing = Scope.get<Context>(scope, leftExp.v);

        if (!existing) {
          notes.push(Note(exp, 'error',
            'Attempt to assign to a variable that does not exist',
          ));

          return null;
        }

        // TODO: Should the scope data really be Context? Not seeming
        // appropriate here. (What's the purpose of scope, notes?)
        scope = Scope.set<Context>(scope, leftExp.v, { value: right.value });

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
          value = VException(
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

            if (left.t === 'array' && right.t === 'array') {
              return { t: 'array', v: [...left.v, ...right.v] };
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

            const str = (
              left.t === 'string' ? left :
              right.t === 'string' ? right :
              null
            );

            const arr = (
              left.t === 'array' ? left :
              right.t === 'array' ? right :
              null
            );

            const num = (
              left.t === 'number' ? left :
              right.t === 'number' ? right :
              null
            );

            // TODO: Implement generic version of this which just requires
            // non-number type to have a + operator
            // TODO: Possibly configure limit for this behaviour during
            // analysis?
            if (str && num) {
              return stringMul(str, num);
            }

            if (arr && num) {
              return arrayMul(arr, num);
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
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=': {
        const op = exp.t;

        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => TypedComparisonValue(op, left, right),
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

        value = VException(
          exp,
          `Type error: ${exp.t.slice(6)}${right.value.t}`,
        );

        return null;
      }

      case 'func': {
        if (exp.topExp && exp.v.name) {
          scope = Scope.add(scope, exp.v.name.v, {
            origin: exp,
            data: {
              scope,
              value: exp,
              notes: [],
            },
          });
        }

        value = exp;
        return null;
      }

      case 'functionCall': {
        const [funcExp, argExps] = exp.v;

        const funcCtx = evalExpression(scope, funcExp);

        scope = funcCtx.scope;
        let func = funcCtx.value;
        notes.push(...funcCtx.notes);

        func = (() => {
          switch (func.t) {
            case 'func':
            case 'unknown':
            case 'exception': {
              return func;
            }

            case 'string':
            case 'number':
            case 'bool':
            case 'null':
            case 'array':
            case 'object':
            // TODO: Expressions should never be missing, so 'missing'
            // shouldn't have to be handled
            case 'missing': {
              return VException(funcExp,
                `Type error: attempt to call a ${func.t} as a function`
              );
            }
          }
        })();

        if (func.t === 'exception') {
          value = func;
          return null;
        }

        const args: ValidValue[] = [];

        for (const argExp of argExps) {
          const argCtx = evalExpression(scope, argExp);

          scope = argCtx.scope;
          const arg = argCtx.value;
          notes.push(...argCtx.notes);

          if (arg.t === 'exception') {
            value = arg;
            return null;
          }

          if (arg.t === 'missing') {
            value = VException(argExp,
              `Argument was ${Value.String(arg)}`,
            );

            return null;
          }

          if (arg.t === 'unknown') {
            value = unknown;
            return null;
          }

          args.push(arg);
        }

        value = (() => {
          switch (func.t) {
            case 'unknown': {
              return unknown;
            }

            case 'func': {
              if (func.v.args.length !== args.length) {
                return VException(exp, [
                  'Arguments length mismatch: ',
                  Value.String(func),
                  ' requires ',
                  func.v.args.length,
                  ' arguments but ',
                  args.length,
                  ' were provided'
                ].join(''));
              }

              let funcScope = Scope<Context>();

              for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                const [argIdentifier] = func.v.args[i].v;
                funcScope = Scope.add(
                  funcScope,
                  argIdentifier.v,
                  {
                    origin: argExps[i],
                    data: {
                      scope: funcScope,
                      value: arg,
                      notes: [],
                    },
                  }
                );
              }

              const body = func.v.body;
              let funcCtx = Context();
              funcCtx.scope = funcScope;

              if (body.t === 'expBody') {
                funcCtx = evalExpression(funcScope, body.v);
              } else {
                funcCtx = analyzeInContext(funcCtx, true, body);
              }

              // TODO: Do some processing with the notes here. Return info
              // should be suppressed (and all infos?) and others should be
              // duplicated at the call site.
              notes.push(...funcCtx.notes);
              return funcCtx.value;
            }
          }
        })();

        return null;
      }

      case 'array': {
        value = { t: 'array', v: [] };
        let arrUnknown = false;
        let arrMissing = false;

        for (const elExp of exp.v) {
          const elCtx = evalExpression(scope, elExp);

          scope = elCtx.scope;
          notes.push(...elCtx.notes);

          if (elCtx.value.t === 'exception') {
            value = elCtx.value;
            return null;
          }

          if (elCtx.value.t === 'unknown') {
            arrUnknown = true;
            continue;
          }

          if (elCtx.value.t === 'missing') {
            arrMissing = true;
            continue;
          }

          value.v.push(elCtx.value);
        }

        if (arrMissing) {
          value = missing;
          return null;
        }

        if (arrUnknown) {
          value = unknown;
          return null;
        }

        return null;
      }

      case 'subscript': {
        const [containerExp, indexExp] = exp.v;

        const containerCtx = evalExpression(scope, containerExp);
        scope = containerCtx.scope;
        notes.push(...containerCtx.notes);

        const indexCtx = evalExpression(scope, indexExp);

        if (containerCtx.value.t === 'array') {
          scope = indexCtx.scope;
          notes.push(...indexCtx.notes);

          if (indexCtx.value.t !== 'number') {
            value = VException(exp,
              `Type error: ${containerCtx.value.t}[${indexCtx.value.t}]`,
            );

            return null;
          }

          if (
            indexCtx.value.v < 0 ||
            indexCtx.value.v !== Math.floor(indexCtx.value.v)
          ) {
            value = VException(indexExp,
              `Invalid array index: ${indexCtx.value.v}`,
            );

            return null;
          }

          if (indexCtx.value.v >= containerCtx.value.v.length) {
            value = VException(exp, [
              'Out of bounds: index ',
              indexCtx.value.v,
              ' but array is only length ',
              containerCtx.value.v.length
            ].join(''));

            return null;
          }

          value = containerCtx.value.v[indexCtx.value.v];
          return null;
        }

        if (containerCtx.value.t === 'object') {
          scope = indexCtx.scope;
          notes.push(...indexCtx.notes);

          if (indexCtx.value.t !== 'string') {
            value = VException(exp,
              `Type error: ${containerCtx.value.t}[${indexCtx.value.t}]`,
            );

            return null;
          }

          const maybeValue = containerCtx.value.v[indexCtx.value.v];

          if (maybeValue === undefined) {
            value = VException(exp,
              `Object key not found: ${indexCtx.value.v}`,
            );

            return null;
          }

          value = maybeValue;
          return null;
        }

        value = VException(exp,
          `Type error: ${containerCtx.value.t}[${indexCtx.value.t}]`,
        );

        return null;
      }

      case 'object': {
        value = { t: 'object', v: {} as { [key: string]: ValidValue } };
        let objMissing = false;
        let objUnknown = false;

        for (const [identifierKey, subExp] of exp.v) {
          const subCtx = evalExpression(scope, subExp);
          scope = subCtx.scope;
          notes.push(...subCtx.notes);

          const vinvValue = ValidInvalidValue(subCtx.value);

          if (vinvValue.t === 'invalid') {
            const invalidValue = vinvValue.v;

            if (invalidValue.t === 'exception') {
              value = invalidValue;
              return null;
            }

            checkNull((() => {
              switch (invalidValue.t) {
                case 'unknown': {
                  objUnknown = true;
                  return null;
                }

                case 'missing': {
                  objMissing = true;
                  return null;
                }
              }
            })());

            continue;
          }

          const validValue = vinvValue.v;
          value.v[identifierKey.v] = validValue;
        }

        if (objMissing) {
          value = missing;
          return null;
        }

        if (objUnknown) {
          value = unknown;
          return null;
        }

        return null;
      }

      case '.':
      case 'methodCall':
      case 'class':
      case 'switch':
      case 'import': {
        value = VException(
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
    value = VException(
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
