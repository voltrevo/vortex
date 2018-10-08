import checkNull from './checkNull';
import Note from './Note';
import Scope from './Scope';
import Syntax from './parser/Syntax';

// TODO: Types start with capitals
// (primitive types can be lowercase?)

export type VString = { cat: 'concrete', t: 'string', v: string };

export function VString(v: string): VString {
  return { cat: 'concrete', t: 'string', v };
}

export type VNumber = { cat: 'concrete', t: 'number', v: number };

export function VNumber(v: number): VNumber {
  return { cat: 'concrete', t: 'number', v };
}

export type VBool = { cat: 'concrete', t: 'bool', v: boolean };

export function VBool(v: boolean): VBool {
  return { cat: 'concrete', t: 'bool', v };
}

export type VNull = { cat: 'concrete', t: 'null', v: null };

export function VNull(): VNull {
  return { cat: 'concrete', t: 'null', v: null };
}

export type VFunc = { cat: 'concrete' } & Syntax.FunctionExpression;

export function VFunc(v: Syntax.FunctionExpression): VFunc {
  return { cat: 'concrete', ...v };
}

export type VConcreteArray = {
  cat: 'concrete',
  t: 'array', v: ConcreteValue[],
};

export function VConcreteArray(v: ConcreteValue[]): VConcreteArray {
  return { cat: 'concrete', t: 'array', v };
}

type VValidArray = { cat: 'valid', t: 'array', v: ValidValue[] };

export type VArray = (
  VConcreteArray |
  VValidArray |
  never
);

export function VArray(v: ValidValue[]): VValidArray {
  return { cat: 'valid', t: 'array', v };
}

export type VConcreteObject = {
  cat: 'concrete',
  t: 'object',
  v: { [key: string]: ConcreteValue },
};

export function VConcreteObject(
  v: { [key: string]: ConcreteValue }
): VConcreteObject {
  return { cat: 'concrete', t: 'object', v };
}

export type VObject = (
  VConcreteObject |
  {
    cat: 'valid',
    t: 'object',
    v: { [key: string]: ValidValue },
  } |
  never
);

export function VObject(v: { [key: string]: ValidValue }): VObject {
  return { cat: 'valid', t: 'object', v };
}

export type VUnknown = { cat: 'valid', t: 'unknown', v: null };

function VUnknown(): VUnknown {
  return { cat: 'valid', t: 'unknown', v: null };
}

export type VMissing = { cat: 'invalid', t: 'missing', v: null };

function VMissing(): VMissing {
  return { cat: 'invalid', t: 'missing', v: null };
}

export type VException = {
  cat: 'invalid';
  t: 'exception';
  v: {
    origin: Syntax.Element;
    tags: Note.Tag[];
    message: string;
  };
}

function VException(
  origin: Syntax.Element,
  tags: Note.Tag[],
  message: string
): VException {
  return { cat: 'invalid', t: 'exception', v: { origin, tags, message } };
}

// TODO: Valid -> Concrete (?)
export type ConcreteValue = (
  VString |
  VNumber |
  VBool |
  VNull |
  VFunc |
  VConcreteArray |
  VConcreteObject |
  never
);

export type ValidValue = (
  ConcreteValue |
  VArray |
  VObject |
  VUnknown |
  never
);

export type Value = (
  ValidValue |
  VMissing |
  VException |
  never
);

function SameType(left: ConcreteValue, right: ConcreteValue): VBool {
  switch (left.t) {
    case 'func': {
      if (right.t !== 'func') {
        return VBool(false);
      }

      // TODO: Types of arguments?
      return VBool(left.v.args.length === right.v.args.length);
    }

    case 'array': {
      if (right.t !== 'array') {
        return VBool(false);
      }

      for (let i = 0; i < left.v.length; i++) {
        const subSameType = SameType(left.v[i], right.v[i]);

        if (!subSameType) {
          return VBool(false);
        }
      }

      return VBool(true);
    }

    case 'object': {
      if (right.t !== 'object') {
        return VBool(false);
      }

      const leftKeys = Object.keys(left.v).sort();
      const rightKeys = Object.keys(right.v).sort();

      if (leftKeys.length !== rightKeys.length) {
        return VBool(false);
      }

      for (let i = 0; i < leftKeys.length; i++) {
        const subSameType = SameType(
          left.v[leftKeys[i]],
          right.v[rightKeys[i]],
        )

        if (!subSameType) {
          return VBool(false);
        }

        return VBool(true);
      }

      return VBool(true);
    }

    case 'string':
    case 'number':
    case 'bool':
    case 'null': {
      return VBool(left.t === right.t);
    }
  }
}

function TypedEqual(
  exp: Syntax.Expression,
  left: ConcreteValue,
  right: ConcreteValue,
): VBool | VException {
  if (!SameType(left, right)) {
    return VException(exp,
      ['type-error', 'comparison'],
      `Type error: ${left} ${exp.t} ${right}`,
    );
  }

  switch (left.t) {
    case 'string':
    case 'number':
    case 'bool':
    case 'null': {
      return VBool(left.v === right.v);
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
        const subEq = TypedEqual(exp, left.v[i], right.v[i]);

        if (subEq.t === 'exception') {
          return subEq;
        }

        if (!subEq.v) {
          return VBool(false);
        }
      }

      return VBool(true);
    }

    case 'object': {
      if (right.t !== 'object') {
        throw new Error('Shouldn\'t be possible');
      }

      // Already checked types are equal so we know that the left keys are also
      // the right keys.
      const keys = Object.keys(left.v).sort();

      for (const key of keys) {
        const subEq = TypedEqual(exp, left.v[key], right.v[key]);

        if (subEq.t === 'exception') {
          return subEq;
        }

        if (!subEq.v) {
          return VBool(false);
        }
      }

      return VBool(true);
    }
  }
}

function TypedLessThan(
  exp: Syntax.Expression,
  left: ConcreteValue,
  right: ConcreteValue,
): VBool | VException {
  const sameType = SameType(left, right);

  if (sameType.v === false) {
    return VException(exp,
      ['type-error', 'comparison'],
      `Type error: ${left} ${exp.t} ${right}`,
    );
  }

  switch (left.t) {
    case 'string':
    case 'number':
    case 'bool':
    case 'null': {
      // Need to use any here because typescript thinks null comparison is bad
      // but we're ok with it and it does the right thing.
      return VBool((left.v as any) < (right.v as any));
    }

    case 'func': {
      // Not defining a way to compare functions right now.
      return VException(exp,
        ['type-error', 'function-comparison'],
        `Type error: ${left} ${exp.t} ${right}`,
      );
    }

    case 'array': {
      if (right.t !== 'array') {
        throw new Error('Shouldn\'t be possible');
      }

      for (let i = 0; i < left.v.length; i++) {
        const subLT = TypedLessThan(exp, left.v[i], right.v[i]);

        if (subLT.t === 'exception') {
          return subLT;
        }

        if (subLT.v) {
          return VBool(true);
        }

        const subGT = TypedLessThan(exp, right.v[i], left.v[i]);

        if (subGT.t === 'exception') {
          return subGT;
        }

        if (subGT.v) {
          return VBool(false);
        }
      }

      return VBool(false);
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
        const subLT = TypedLessThan(exp, left.v[key], right.v[key]);

        if (subLT.t === 'exception') {
          return subLT;
        }

        if (subLT.v) {
          return VBool(true);
        }

        const subGT = TypedLessThan(exp, right.v[key], left.v[key]);

        if (subGT.t === 'exception') {
          return subGT;
        }

        if (subGT.v) {
          return VBool(false);
        }
      }

      return VBool(false);
    }
  }
}

function InvertIfBool<V extends Value>(x: V): V {
  if (x.t !== 'bool') {
    return x;
  }

  return { t: 'bool', v: !x.v } as V; // as V because typescript incompleteness
}

type ComparisonOp = '==' | '!=' | '<' | '>' | '<=' | '>=';

function TypedComparison(
  exp: Syntax.Expression,
  op: ComparisonOp,
  left: ConcreteValue,
  right: ConcreteValue,
): VBool | VException {
  switch (op) {
    case '==': return TypedEqual(exp, left, right);
    case '!=': return InvertIfBool(TypedEqual(exp, left, right));
    case '<': return TypedLessThan(exp, left, right);
    case '>': return TypedLessThan(exp, right, left);
    case '<=': return InvertIfBool(TypedLessThan(exp, right, left));
    case '>=': return InvertIfBool(TypedLessThan(exp, left, right));
  }
}

function SynthExp(
  value: ConcreteValue,
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
      v: value.v.map(v => SynthExp(v, p)),
      p,
    };

    case 'object': return {
      t: 'object',
      v: Object.keys(value.v).sort().map(key => [
        { t: 'IDENTIFIER', v: key, p },
        SynthExp(value.v[key], p)
      ] as [Syntax.Identifier, Syntax.Expression]),
      p,
    }
  }
}

namespace Value {
  export function String(v: Value): string {
    switch (v.t) {
      case 'string': return JSON.stringify(v.v);
      case 'number': return v.v.toString();
      case 'bool': return v.v.toString();
      case 'null': return 'null';

      // TODO: include argument names
      case 'func': return `<func ${v.v.name ? v.v.name.v : '(anonymous)'}>`;

      case 'array': {
        switch (v.cat) {
          // These are the same but need to be separated out due to a curious
          // typescript edge case
          case 'concrete': return `[${v.v.map(Value.String).join(', ')}]`;
          case 'valid': return `[${v.v.map(Value.String).join(', ')}]`;
        }
      }

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
}

function stringMul(s: VString, n: VNumber): VString {
  // TODO: Check n is an appropriate number (wait for integer implementation?)
  return VString(s.v.repeat(n.v));
}

function arrayMul(a: VArray, n: VNumber): VArray {
  // TODO: Check n is an appropriate number (wait for integer implementation?)

  switch (a.cat) {
    case 'concrete': {
      const res = VConcreteArray([]);

      for (let i = 0; i < n.v; i++) {
        res.v.push(...a.v);
      }

      return res;
    }

    case 'valid': {
      const res = VArray([]);

      for (let i = 0; i < n.v; i++) {
        res.v.push(...a.v);
      }

      return res;
    }
  }
}

function objMul(
  exp: Syntax.Expression,
  obj: VObject,
  n: VNumber
): VObject | VException {
  if (n.v === 0) {
    return VConcreteObject({});
  }

  if (n.v === 1) {
    return obj;
  }

  if (Object.keys(obj.v).length === 0) {
    return obj;
  }

  return VException(exp,
    ['object-multiplication'],
    `Attempt to multiply non-empty object by ${n.v} (can only multiply ` +
    'non-empty objects by 0 or 1)',
  );
}

function objectLookup(
  exp: Syntax.Expression,
  obj: Value,
  index: Value,
): Value {
  if (obj.t === 'exception') {
    return obj;
  }

  if (index.t === 'exception') {
    return index;
  }

  if (
    (obj.t !== 'object' && obj.t !== 'unknown') ||
    (index.t !== 'string' && index.t !== 'unknown')
  ) {
    return VException(exp,
      ['type-error', 'object-subscript'],
      `Type error: ${obj.t}[${index.t}]`,
    );
  }

  if (obj.t === 'unknown' || index.t === 'unknown') {
    // TODO: maybeException?
    return VUnknown();
  }

  const maybeValue = obj.v[index.v];

  if (maybeValue === undefined) {
    return VException(exp,
      ['key-not-found'],
      `Object key not found: ${index.v}`,
    );
  }

  return maybeValue;
}

type Context = {
  scope: Scope<ValidValue>;
  value: Value;
  notes: Note[];
};

function Context(): Context {
  return {
    scope: Scope<ValidValue>(),
    value: VMissing(),
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

          if (ctx.value.t === 'exception') {
            context.value = ctx.value;
          }

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
              ['value-needed'],
              `Return expression was ${Value.String(value)}`,
            );
          } else if (value.t !== 'exception') {
            context.notes.push(Note(
              statement,
              'info',
              ['analysis', 'return-value'],
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

          if (value.cat === 'invalid') {
            context.value = (() => {
              switch (value.t) {
                case 'exception':
                  return value;

                case 'missing':
                  // TODO: evalSubExpression should remove the need for this
                  return VException(statement.v,
                    ['value-needed', 'assert'],
                    'Assertion expression is missing a value',
                  );
              }
            })();

            return null;
          }

          if (value.t === 'unknown') {
            // TODO!: maybeException handling
            return null;
          }

          if (value.t !== 'bool') {
            context.notes.push(Note(
              statement.v,
              'error',
              ['analysis', 'type-error', 'assert-non-bool'],
              `Type error: assert ${value.t}`,
            ));

            return null;
          }

          if (value.v === false) {
            // TODO: Format code for other exceptions like this
            context.value = VException(statement.v,
              ['assert-false'],
              `Asserted ${ExpressionString(context.scope, statement.v)}`,
            );

            return null;
          }

          return null;
        }

        case 'if': {
          const [cond, block] = statement.v;
          const condCtx = evalExpression(context.scope, cond);
          context.notes.push(...condCtx.notes);

          const condValue = condCtx.value;

          if (condValue.t === 'exception') {
            context.value = condValue;
            return null;
          }

          // TODO: This should be handled by evalSubExpression
          if (condValue.t === 'missing') {
            context.value = VException(cond,
              ['value-needed', 'if-condition', 'non-bool-condition'],
              'Missing condition value',
            );

            return null;
          }

          // TODO: unknown -> maybeException?

          if (condValue.t !== 'bool') {
            context.value = VException(cond,
              ['non-bool-condition', 'if-condition'],
              `Type error: Non-bool condition: ${condValue.t}`,
            );

            return null;
          }

          if (condValue.v) {
            context.scope = { parent: context.scope, variables: {} };
            context = analyzeInContext(context, false, block);

            if (context.scope.parent === null) {
              throw new Error('This should not be possible');
            }

            context.scope = context.scope.parent;
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
              ['not-implemented', 'for-control'],
              // TODO: Need to capture more structure in compiler notes
              `Not implemented: for loop with (${control.t}) control clause`,
            );

            return null;
          }

          const cond: Syntax.Expression = (() => {
            if (control === null) {
              return SynthExp(VBool(true), statement.p);
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
            context.notes.push(...condCtx.notes);
            const condValue = condCtx.value;

            // TODO: Note counting, deduplication with if

            if (condValue.t === 'missing') {
              // TODO: unknown should be handled differently
              context.value = VException(cond,
                ['value-needed', 'for-condition', 'non-bool-condition'],
                'Missing condition value',
              );

              break;
            }

            if (condValue.t !== 'bool') {
              context.value = VException(
                cond,
                ['non-bool-condition', 'for-condition'],
                `Type error: Non-bool condition: ${condValue.t}`,
              );

              break;
            }

            if (condValue.v === false) {
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
              context.notes.push(Note(statement,
                'warn',
                ['analysis', 'iteration-limit'],
                'Hit iteration limit of 2048',
              ));

              // Maybe exception?
              context.value = VUnknown();
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
            ['not-implemented'],
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
          return [Note(
            context.value.v.origin,
            'error',
            ['analysis', 'exception', 'value-needed', ...context.value.v.tags],
            `Threw exception: ${context.value.v.message}`,
          )];
        }

        return [];

      case 'missing': {
        if (needsValue) {
          return [Note(
            program,
            'error',
            ['analysis', 'value-needed'],
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
  scope: Scope<ValidValue>,
  exp: Syntax.Expression
): Context {
  let { value, notes } = Context();

  checkNull((() => {
    switch (exp.t) {
      case 'NUMBER': {
        value = VNumber(Number(exp.v));
        return null;
      }

      case 'BOOL': {
        value = VBool(exp.v);
        return null;
      }

      case 'NULL': {
        value = VNull();
        return null;
      }

      case 'STRING': {
        value = VString(exp.v.substring(1, exp.v.length - 1));
        return null;
      }

      case 'IDENTIFIER': {
        const entry = Scope.get(scope, exp.v);

        if (entry === null) {
          value = VException(
            exp,
            ['not-found'],
            `Variable does not exist: ${exp.v}`
          );

          return null;
        }

        value = entry.data;
        return null;
      }

      case ':=': {
        const left = exp.v[0];

        if (left.t !== 'IDENTIFIER') {
          value = VException(
            left,
            ['not-implemented', 'non-identifier-creation-target', 'creation'],
            'Not implemented: non-identifier lvalues',
          );

          return null;
        }

        const right = evalExpression(scope, exp.v[1]);
        notes.push(...right.notes);

        if (right.value.cat === 'invalid') {
          value = VException(
            exp.v[1],
            ['value-needed', 'creation'],
            'Didn\'t get a value for rhs of creation operator',
          );

          return null;
        }

        scope = Scope.add(scope, left.v, {
          origin: left,
          data: right.value,
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

        if (right.value.t === 'missing') {
          // TODO: Better message
          value = VException(
            rightExp,
            ['value-needed'],
            'Value required'
          );

          return null;
        }

        if (leftExp.t === 'array') {
          // TODO: Fail earlier / in a more informative way when attempting a
          // destructuring and compound assignment simultaneously?

          // TODO: Unknown should also work
          if (right.value.t !== 'array') {
            value = VException(exp,
              ['type-error', 'destructuring-mismatch'],
              // TODO: a vs an
              'Assignment target is an array but the value is a ' +
              right.value.t
            );

            return null;
          }

          if (right.value.cat !== 'concrete') {
            value = VException(exp,
              ['type-error', 'destructuring-mismatch'],
              // TODO: This is wrong / implement proper unknown handling here
              'Assignment target is an array but the value is unknown',
            );

            return null;
          }

          if (leftExp.v.length !== right.value.v.length) {
            // TODO: Implement _ as special ignore identifier
            value = VException(
              exp,
              ['type-error', 'destructuring-mismatch', 'length-mismatch'],
              [
                'Array destructuring length mismatch: ',
                leftExp.v.length,
                ' targets but only ',
                right.value.v.length,
                ' values',
              ].join(''),
            );

            return null;
          }

          for (let i = 0; i < leftExp.v.length; i++) {
            const subLeft = leftExp.v[i];

            // Need to use evaluated rhs rather than decomposing into
            // assignments so that e.g. [a, b] = [b, a] works rather than
            // producing a = b; b = a; which doesn't swap.
            const synthSubRight = SynthExp(
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

        let leftBaseExp: Syntax.Expression = leftExp;
        const accessChain: (string | number)[] = [];

        while (true) {
          if (leftBaseExp.t === 'IDENTIFIER') {
            break;
          }

          if (leftBaseExp.t === '.') {
            const [newBase, identifier]: [
              // Not quite sure why typescript needs this annotation
              Syntax.Expression,
              Syntax.Identifier // Typescript disallows trailing comma?
            ] = leftBaseExp.v;

            leftBaseExp = newBase;
            accessChain.unshift(identifier.v);

            continue;
          }

          if (leftBaseExp.t === 'subscript') {
            const [newBase, accessor]: [
              // Not quite sure why typescript needs this annotation
              Syntax.Expression,
              Syntax.Expression // Typescript disallows trailing comma?
            ] = leftBaseExp.v;

            const accessorCtx = evalExpression(scope, accessor);
            scope = accessorCtx.scope;
            notes.push(...accessorCtx.notes);

            if (
              accessorCtx.value.t !== 'string' &&
              accessorCtx.value.t !== 'number'
            ) {
              value = VException(accessor,
                ['type-error', 'subscript'],
                `Type error: ${accessorCtx.value.t} subscript`,
              );

              return null;
            }

            leftBaseExp = newBase;
            accessChain.unshift(accessorCtx.value.v);

            continue;
          }

          value = VException(leftBaseExp,
            ['invalid-assignment-target', 'destructuring'],
            // TODO: Don't analyze if failed validation and throw internal
            // error here instead
            `(redundant) Invalid assignment target: ${leftBaseExp.t} ` +
            'expression',
          );

          return null;
        }

        const existing = Scope.get(scope, leftBaseExp.v);

        if (!existing) {
          notes.push(Note(
            exp,
            'error',
            ['analysis', 'not-found', 'assignment'],
            'Attempt to assign to a variable that does not exist',
          ));

          return null;
        }

        function modifyChain(
          oldValue: ValidValue,
          chain: (string | number)[],
          newValue: ValidValue,
        ): Value {
          const [index, ...newChain] = chain;

          if (index === undefined) {
            return newValue;
          }

          if (oldValue.t === 'object' && typeof index === 'string') {
            // TODO: Improve typing so that typescript knows this can be
            // undefined instead of using its permissive (incorrect) analysis
            // of index typing.
            const oldSubValue = oldValue.v[index];

            if (oldSubValue === undefined) {
              return VException(leftExp,
                ['key-not-found'],
                // TODO: Better message, location
                'Key not found',
              );
            }

            const newValueAtIndex = modifyChain(
              oldValue.v[index],
              newChain,
              newValue,
            );

            if (newValueAtIndex.cat === 'invalid') {
              return newValueAtIndex;
            }

            if (
              oldValue.cat === 'concrete' &&
              newValueAtIndex.cat === 'concrete'
            ) {
              return VConcreteObject({
                ...oldValue.v,
                [index]: newValueAtIndex
              });
            }

            return VObject({
              ...oldValue.v,
              [index]: newValueAtIndex,
            });
          }

          if (oldValue.t === 'array' && typeof index === 'number') {
            if (
              index !== Math.floor(index) ||
              index < 0
            ) {
              // TODO: More accurate expression reference (just providing
              // entire lhs instead of specifically the bad subscript/.)
              return VException(leftExp,
                ['out-of-bounds', 'index-bad'],
                `Invalid index: ${index}`,
              );
            }

            if (index >= oldValue.v.length) {
              // TODO: More accurate expression reference (just providing
              // entire lhs instead of specifically the bad subscript/.)
              return VException(
                leftExp,
                ['out-of-bounds', 'index-too-large'],
                [
                  'Out of bounds: index ',
                  index,
                  ' but array is only length ',
                  oldValue.v.length
                ].join('')
              );
            }

            const newValueAtIndex = modifyChain(
              oldValue.v[index],
              newChain,
              newValue,
            );

            if (newValueAtIndex.cat === 'invalid') {
              return newValueAtIndex;
            }

            if (
              oldValue.cat === 'concrete' &&
              newValueAtIndex.cat === 'concrete'
            ) {
              return VConcreteArray([
                ...oldValue.v.slice(0, index),
                newValueAtIndex,
                ...oldValue.v.slice(index + 1),
              ]);
            }

            return VArray([
              ...oldValue.v.slice(0, index),
              newValueAtIndex,
              ...oldValue.v.slice(index + 1),
            ]);
          }

          // TODO: More accurate expression reference (just providing entire
          // lhs instead of specifically the bad subscript/.)
          return VException(leftExp,
            ['type-error', 'index-bad'],
            `Type error: attempt to index ${oldValue.t} with a ` +
            typeof index,
          );
        }

        const newBaseValue = modifyChain(
          existing.data,
          accessChain,
          right.value,
        );

        if (newBaseValue.t === 'exception') {
          value = newBaseValue;
          return null;
        }

        if (newBaseValue.t === 'missing') {
          value = VException(exp,
            ['value-needed'],
            // TODO: Better wording
            'Expected a value',
          );

          return null;
        }

        // TODO: Should the scope data really be Context? Not seeming
        // appropriate here. (What's the purpose of scope, notes?)
        scope = Scope.set(
          scope,
          leftBaseExp.v,
          newBaseValue,
        );

        return null;
      }

      case '--':
      case '++': {
        const subExp = exp.v;

        const subExpCtx = evalExpression(scope, subExp);
        scope = subExpCtx.scope;
        notes.push(...subExpCtx.notes);

        const subValue = subExpCtx.value;

        if (subValue.cat === 'invalid') {
          value = (() => {
            switch (subValue.t) {
              case 'exception': return subValue;

              case 'missing': {
                // TODO: This case might be unnecessary
                return VException(subExp,
                  ['value-needed'],
                  `Missing value for ${exp.t} operator`,
                );
              }
            }
          })();

          return null;
        }

        if (subValue.t !== 'number') {
          value = VException(
            subExp,
            ['analysis', 'type-error', 'inc-dec'],
            `Type error: ${subValue.t}${exp.t}`,
          );

          return null;
        }

        if (subExp.t !== 'IDENTIFIER') {
          value = VException(
            exp,
            ['not-implemented', 'non-identifier-assignment-target'],
            `Not implemented: non-identifier lvalues`,
          );

          return null;
        }

        const newValue = {
          t: 'number' as 'number',
          v: (
            exp.t === '++' ?
            subValue.v + 1 :
            subValue.v - 1
          )
        };

        scope = Scope.set(scope, subExp.v, newValue);

        return null;
      }

      case '+': {
        ({ scope, value, notes } = evalVanillaOperator(
          { scope, value, notes },
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return VNumber(left.v + right.v);
            }

            if (left.t === 'string' && right.t === 'string') {
              return VString(left.v + right.v);
            }

            if (left.t === 'array' && right.t === 'array') {
              if (left.cat === 'concrete' && right.cat === 'concrete') {
                return VConcreteArray([...left.v, ...right.v]);
              }

              return VArray([...left.v, ...right.v]);
            }

            if (left.t === 'object' && right.t === 'object') {
              const leftKeys: { [key: string]: true | undefined } = {};

              for (const key of Object.keys(left.v)) {
                leftKeys[key] = true;
              }

              for (const key of Object.keys(right.v)) {
                if (leftKeys[key]) {
                  // TODO: Should be exception rather than this null which will
                  // produce a type error.
                  return null;
                }
              }

              if (left.cat === 'concrete' && right.cat === 'concrete') {
                return VConcreteObject({ ...left.v, ...right.v });
              }

              return VObject({ ...left.v, ...right.v });
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
              return VNumber(left.v * right.v);
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

            const obj = (
              left.t === 'object' ? left :
              right.t === 'object' ? right :
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

            if (obj && num) {
              return objMul(exp, obj, num);
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
              return VNumber(op(left.v, right.v));
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
              return VBool(op(left.v, right.v));
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
          (left, right) => {
            if (left.cat !== 'concrete' || right.cat !== 'concrete') {
              // TODO: Should be possible to sometimes (often?) determine
              // ordering without concrete array/object.
              return VUnknown();
            }

            return TypedComparison(exp, op, left, right)
          },
        ));

        return null;
      }

      case 'unary -':
      case 'unary +': {
        const right = evalExpression(scope, exp.v);
        notes.push(...right.notes);

        if (right.value.cat === 'invalid' || right.value.t === 'unknown') {
          value = right.value;
          return null;
        }

        if (right.value.t !== 'number') {
          value = VException(
            exp,
            ['type-error', 'unary-plus-minus'],
            `Type error: ${exp.t.slice(6)}${right.value.t}`,
          );

          return null;
        }

        value = VNumber(
          exp.t === 'unary -' ?
          -right.value.v :
          +right.value.v
        );

        return null;
      }

      case 'func': {
        value = VFunc(exp);

        if (exp.topExp && exp.v.name) {
          scope = Scope.add(scope, exp.v.name.v, {
            origin: exp,
            data: value,
          });
        }

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
                ['type-error', 'call-non-function'],
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
              ['value-needed'],
              `Argument was ${Value.String(arg)}`,
            );

            return null;
          }

          if (arg.t === 'unknown') {
            value = VUnknown();
            return null;
          }

          args.push(arg);
        }

        value = (() => {
          switch (func.t) {
            case 'unknown': {
              return VUnknown();
            }

            case 'func': {
              if (func.v.args.length !== args.length) {
                return VException(
                  exp,
                  ['type-error', 'arguments-length-mismatch'],
                  [
                    'Arguments length mismatch: ',
                    Value.String(func),
                    ' requires ',
                    func.v.args.length,
                    ' arguments but ',
                    args.length,
                    ' were provided'
                  ].join(''),
                );
              }

              let funcScope = Scope<ValidValue>();

              for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                const [argIdentifier] = func.v.args[i].v;
                funcScope = Scope.add(
                  funcScope,
                  argIdentifier.v,
                  {
                    origin: argExps[i],
                    data: arg,
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
        value = VArray([]);
        let arrConcrete = true;

        for (const elExp of exp.v) {
          const elCtx = evalExpression(scope, elExp);

          scope = elCtx.scope;
          notes.push(...elCtx.notes);

          if (elCtx.value.t === 'exception') {
            value = elCtx.value;
            return null;
          }

          if (elCtx.value.t === 'missing') {
            value = VMissing();
            return null;
          }

          if (elCtx.value.cat !== 'concrete') {
            arrConcrete = false;
          }

          value.v.push(elCtx.value);
        }

        if (arrConcrete) {
          // TODO: Breaking the type system here, but this should work. What
          // to do here?
          (value as any).cat = 'concrete';
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
              ['type-error', 'subscript'],
              `Type error: ${containerCtx.value.t}[${indexCtx.value.t}]`,
            );

            return null;
          }

          if (
            indexCtx.value.v < 0 ||
            indexCtx.value.v !== Math.floor(indexCtx.value.v)
          ) {
            value = VException(indexExp,
              ['subscript', 'out-of-bounds', 'index-bad'],
              `Invalid array index: ${indexCtx.value.v}`,
            );

            return null;
          }

          if (indexCtx.value.v >= containerCtx.value.v.length) {
            value = VException(
              exp,
              ['out-of-bounds', 'index-too-large'],
              [
                'Out of bounds: index ',
                indexCtx.value.v,
                ' but array is only length ',
                containerCtx.value.v.length
              ].join(''),
            );

            return null;
          }

          value = containerCtx.value.v[indexCtx.value.v];
          return null;
        }

        if (containerCtx.value.t === 'object') {
          scope = indexCtx.scope;
          notes.push(...indexCtx.notes);
          value = objectLookup(exp, containerCtx.value, indexCtx.value);
          return null;
        }

        value = VException(exp,
          ['type-error', 'subscript', 'object'],
          `Type error: ${containerCtx.value.t}[${indexCtx.value.t}]`,
        );

        return null;
      }

      case 'object': {
        value = VObject({});
        let objConcrete = true;

        for (const [identifierKey, subExp] of exp.v) {
          const subCtx = evalExpression(scope, subExp);
          scope = subCtx.scope;
          notes.push(...subCtx.notes);

          const subValue = subCtx.value;

          if (subValue.t === 'exception' || subValue.t === 'missing') {
            value = subValue;
            return null;
          }

          if (subValue.cat !== 'concrete') {
            objConcrete = false;
          }

          value.v[identifierKey.v] = subValue;
        }

        if (objConcrete) {
          value.cat = 'concrete';
        }

        return null;
      }

      case '.': {
        const [objExp, keyExp] = exp.v;

        const objCtx = evalExpression(scope, objExp);
        scope = objCtx.scope;
        notes.push(...objCtx.notes);
        value = objectLookup(exp, objCtx.value, VString(keyExp.v));

        return null;
      }

      case 'methodCall':
      case 'class':
      case 'switch':
      case 'import': {
        value = VException(
          exp,
          ['not-implemented'],
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

  if (left.value.cat === 'invalid') {
    return { scope, value: left.value, notes };
  }

  const right = evalExpression(scope, exp.v[1]);
  scope = right.scope;
  notes.push(...right.notes);

  if (right.value.cat === 'invalid') {
    return { scope, value: right.value, notes };
  }

  let value = combine(left.value, right.value);

  if (value === null) {
    // TODO: Combine should return something more informative than null to
    // indicate that a type error should result.
    value = VException(
      exp,
      ['type-error', 'operator'],
      `Type error: ${left.value.t} ${exp.t} ${right.value.t}`,
    );
  }

  return { scope, value, notes };
}

function ExpressionString(
  scope: Scope<ValidValue>,
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
    case '--':
    case '++': {
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
