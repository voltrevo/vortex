import checkNull from './checkNull';
import Note from './Note';
import Package from './Package';
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

export type FuncRef = {
  cat: 'ref';
  t: 'func-ref';
  v: Syntax.FunctionExpression;
};

type ST = {
  root: {
    file: string;
  };
  entry: {
    origin: Syntax.Element;
    data: ValidValue | FuncRef;
  };
};

export function ScopeGetExt(
  scope: Scope.Map<ST>,
  name: string,
): { origin: Syntax.Element, data: ValidValue } | null {
  const entry = Scope.get(scope, name);

  if (entry === null) {
    return null;
  }

  if (entry.data.cat !== 'ref') {
    // The intention is {return entry} but a limitation in typescript requires
    // it to be reconstructed like this.
    return {
      origin: entry.origin,
      data: entry.data,
    };
  }

  return {
    origin: entry.origin,
    data: VFunc({ exp: entry.data.v, scope }),
  };
}

export type VFunc = {
  cat: 'concrete';
  t: 'func';
  v: {
    exp: Syntax.FunctionExpression;
    scope: Scope.Map<ST>;
  };
};

export function VFunc(v: {
  exp: Syntax.FunctionExpression;
  scope: Scope.Map<ST>;
}): VFunc {
  return { cat: 'concrete', t: 'func', v };
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
      return VBool(left.v.exp.v.args.length === right.v.exp.v.args.length);
    }

    case 'array': {
      if (right.t !== 'array' || right.v.length !== left.v.length) {
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
      // TODO: Surfacing this is confusing because eg '>' gets swapped to '<'
      // and this inverts left and right (compared to user's code)
      `Type error: ${Value.String(left)} < ${Value.String(right)}`,
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

namespace Value {
  export function String(v: Value): string {
    switch (v.t) {
      case 'string': return JSON.stringify(v.v);
      case 'number': return v.v.toString();
      case 'bool': return v.v.toString();
      case 'null': return 'null';

      // TODO: include argument names
      case 'func': return (
        `<func ${v.v.exp.v.name ? v.v.exp.v.name.v : '(anonymous)'}>`
      );

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
): ValidValue | VException {
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
  scope: Scope.Map<ST>;
  value: Value;
  notes: Note[];
};

function Context(file: string): Context {
  return {
    scope: Scope.Map<ST>({ file }),
    value: VMissing(),
    notes: [],
  };
}

export default function analyze(pack: Package, file: string) {
  let context = Context(file);

  const moduleEntry = pack.modules[file];

  if (moduleEntry === undefined || moduleEntry.t === 'ParserNotes') {
    context.value = VUnknown();
    return context;
  }

  for (const dep of moduleEntry.dependencies.local) {
    const importCtx = analyze(pack, dep);

    if (importCtx.value.cat === 'invalid') {
      context.value = (() => {
        switch (importCtx.value.t) {
          case 'missing': return VException(
            // TODO: better location
            moduleEntry.program,
            ['analysis', 'value-needed'],
            'Didn\'t get a value for import ' + dep,
          );

          case 'exception': return importCtx.value;
        }
      })();

      return context;
    }

    context.scope = Scope.add(context.scope, `import:@:${dep}`, {
      origin: moduleEntry.program,
      data: importCtx.value,
    });
  }

  // TODO: This is pretty hacky
  context.scope = Scope.add(context.scope, ':file', {
    origin: moduleEntry.program,
    data: VString(file),
  });

  context = analyzeInContext(context, true, moduleEntry.program, true);

  return context;
}

function analyzeInContext(
  context: Context,
  needsValue: boolean,
  program: Syntax.Program,
  topLevel: boolean,
): Context {
  const hoists: Syntax.FunctionExpression[] = [];
  const statements: Syntax.Statement[] = [];

  for (const statement of program.v) {
    if (statement.t === 'e' && statement.v.t === 'func') {
      hoists.push(statement.v);
    } else {
      statements.push(statement);
    }
  }

  for (const hoist of hoists) {
    if (hoist.v.name === null) {
      // Anonymous hoist is meaningless. Validation emits a warn about this.
      continue;
    }

    context.scope = Scope.add(context.scope, hoist.v.name.v, {
      origin: hoist,
      data: {
        cat: 'ref',
        t: 'func-ref',
        v: hoist,
      },
    });
  }

  for (const statement of statements) {
    checkNull((() => {
      switch (statement.t) {
        case 'e': {
          const ctx = evalTopExpression(context.scope, statement.v);
          context.scope = ctx.scope;
          context.notes.push(...ctx.notes);

          if (ctx.exception !== null) {
            context.value = ctx.exception;
          }

          return null;
        }

        case 'return': {
          const { value, notes } = evalSubExpression(
            context.scope,
            statement.v
          );

          context.value = value;
          context.notes.push(...notes);

          if (value.t !== 'exception' && topLevel) {
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
          const { value, notes } = evalSubExpression(
            context.scope,
            statement.v
          );

          context.notes.push(...notes);

          if (value.t === 'exception') {
            context.value = value;
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
          const condEval = evalSubExpression(context.scope, cond);
          context.notes.push(...condEval.notes);

          const condValue = condEval.value;

          if (condValue.t === 'exception') {
            context.value = condValue;
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
            context.scope = Scope.push(context.scope);
            context = analyzeInContext(context, false, block, topLevel);

            if ('root' in context.scope.parent) {
              throw new Error('This should not be possible');
            }

            context.scope = context.scope.parent;
          }

          return null;
        }

        case 'for': {
          const { control, block } = statement.v;

          // TODO: Impure function... (was too tempting, what will this look
          // like when rewritten in vortex?)
          function cond(): VBool | VException {
            if (
              control !== null &&
              control.t !== 'condition' &&
              control.t !== 'setup; condition; next'
            ) {
              return VException(
                statement,
                ['not-implemented', 'for-control'],
                // TODO: Need to capture more structure in compiler notes
                `Not implemented: for loop with (${control.t}) control clause`,
              );
            }

            if (control === null) {
              return VBool(true);
            }

            const condExp = (() => {
              switch (control.t) {
                case 'condition': return control.v;
                case 'setup; condition; next': return control.v[1];
              }
            })();

            const condEval = evalSubExpression(context.scope, condExp);
            context.notes.push(...condEval.notes);

            if (condEval.value.t !== 'bool') {
              return VException(
                condExp,
                ['non-bool-condition', 'for-condition'],
                `Type error: Non-bool condition: ${condEval.value.t}`,
              );
            }

            return condEval.value;
          }

          context.scope = Scope.push(context.scope);

          if (control && control.t === 'setup; condition; next') {
            const [setup] = control.v;
            const setupCtx = evalTopExpression(context.scope, setup);
            context.scope = setupCtx.scope;
            context.notes.push(...setupCtx.notes);
          }

          let iterations = 0;

          while (true) {
            const condValue = cond();

            if (condValue.t === 'exception') {
              context.value = condValue;
              break;
            }

            // TODO: Note counting, deduplication with if

            // TODO: unknown -> maybeException?

            if (condValue.v === false) {
              break;
            }

            context.scope = Scope.push(context.scope);
            context = analyzeInContext(context, false, block, topLevel);

            if (context.value.t !== 'exception') {
              if (control && control.t === 'setup; condition; next') {
                const [, , next] = control.v;
                const nextCtx = evalTopExpression(context.scope, next);
                context.scope = nextCtx.scope;
                context.notes.push(...nextCtx.notes);
              }
            }

            if ('root' in context.scope.parent) {
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

          if ('root' in innerScope) {
            throw new Error('This should not be possible');
          }

          // TODO: It would be better to use Scope.pop here but it's difficult
          // due to typescript limitations.
          context.scope = innerScope;

          return null;
        }

        case 'import': {
          const importValue = (() => {
            const fileEntry = Scope.get(context.scope, ':file');

            if (fileEntry === null || fileEntry.data.t !== 'string') {
              throw new Error('Shouldn\'t be possible');
            }

            const resolved = Package.resolveImport(fileEntry.data.v, statement);

            if (!Array.isArray(resolved)) {
              return VUnknown();
            }

            const importScopeName = ['import', ...resolved].join(':');

            const importEntry = Scope.get(context.scope, importScopeName);

            if (importEntry === null) {
              // TODO: will this be possible?
              return VUnknown();
            }

            return importEntry.data;
          })();

          const [importIdentifier] = statement.v;

          context.scope = Scope.add(context.scope, importIdentifier.v, {
            origin: importIdentifier,
            data: importValue,
          });

          return null;
        }

        case 'break':
        case 'continue': {
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

type TopExpressionResult = {
  scope: Scope.Map<ST>;
  notes: Note[];
  exception: VException | null;
};

function TopExpressionResult(scope: Scope.Map<ST>): TopExpressionResult {
  return { scope, notes: [], exception: null };
}

function evalTopExpression(
  scope: Scope.Map<ST>,
  exp: Syntax.Expression,
): TopExpressionResult {
  let { notes, exception } = TopExpressionResult(scope);

  checkNull((() => {
    switch (exp.t) {
      // TODO: Support more compound assignment operators
      // TODO: Better lvalues - preserve identifiers during eval
      // e.g. this will enable: [a, b][getIndex()] = 1;
      case ':=':
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
              case ':=': return null;
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

        const right = evalSubExpression(scope, rightExp);
        notes.push(...right.notes);

        if (right.value.t === 'exception') {
          exception = right.value;
          return null;
        }

        ({ scope, exception, notes } = evalCreateOrAssign(
          { scope, exception, notes },
          exp,
          leftExp,
          exp.t === ':=' ? ':=' : '=',
          right.value,
        ));

        return null;
      }

      case '--':
      case '++': {
        const subExp = exp.v;

        const subEval = evalSubExpression(scope, subExp);
        notes.push(...subEval.notes);
        const subValue = subEval.value;

        if (subValue.t === 'exception') {
          exception = subValue;
          return null;
        }

        if (subValue.t !== 'number') {
          exception = VException(
            subExp,
            ['analysis', 'type-error', 'inc-dec'],
            `Type error: ${subValue.t}${exp.t}`,
          );

          return null;
        }

        if (subExp.t !== 'IDENTIFIER') {
          exception = VException(
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

      case 'func': {
        const func = VFunc({ exp, scope });

        if (!exp.topExp) {
          // TODO: Enforce this by typing?
          throw new Error('Shouldn\'t be possible');
        }

        if (exp.v.name) {
          scope = Scope.add(scope, exp.v.name.v, {
            origin: exp,
            data: func,
          });
        }

        return null;
      }

      case 'class':
      case 'import': {
        exception = VException(
          exp,
          ['not-implemented'],
          `Not implemented: ${exp.t} expression`,
        );

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
      case 'array':
      case 'object':
      case 'import':
      case 'switch':
      case 'func':
      case 'class':
      case 'subscript':
      case 'functionCall':
      case 'methodCall':
      case '.': {
        throw new Error(
          'Non-top expression at top level should have been caught during ' +
          'validation.'
        );
      }
    }
  })());

  return { scope, exception, notes };
}

function evalCreateOrAssign(
  topExpressionResult: TopExpressionResult,
  exp: Syntax.Expression,
  leftExp: Syntax.Expression,
  op: '=' | ':=',
  right: ValidValue,
): TopExpressionResult {
  let { scope, exception, notes } = topExpressionResult;

  (() => {
    if (leftExp.t === 'array' || leftExp.t === 'object') {
      // TODO: Fail earlier / in a more informative way when attempting a
      // destructuring and compound assignment simultaneously?

      // TODO: Unknown should also work
      if (right.t !== leftExp.t) {
        exception = VException(exp,
          ['type-error', 'destructuring-mismatch'],
          // TODO: a vs an
          `Assignment target is an ${leftExp.t} but the value is a ` +
          right.t
        );

        return null;
      }

      if (right.cat !== 'concrete') {
        exception = VException(exp,
          ['type-error', 'destructuring-mismatch'],
          // TODO: This is wrong / implement proper unknown handling here
          'Assignment target is an array but the value is unknown',
        );

        return null;
      }

      const numRightValues = (
        right.t === 'array' ?
        right.v.length :
        Object.keys(right.v).length
      );

      if (leftExp.v.length !== numRightValues) {
        // TODO: Implement _ as special ignore identifier
        // TODO: Customize message for object destructuring?
        exception = VException(
          exp,
          ['type-error', 'destructuring-mismatch', 'length-mismatch'],
          [
            'Destructuring length mismatch: ',
            leftExp.v.length,
            ' targets but only ',
            numRightValues,
            ' values',
          ].join(''),
        );

        return null;
      }

      for (let i = 0; i < leftExp.v.length; i++) {
        const { key, target } = (() => {
          if (leftExp.t === 'object') {
            const [{ v: key }, target] = leftExp.v[i];
            return { key, target };
          }

          return { key: null, target: leftExp.v[i] };
        })();

        if (key !== null && !(key in right.v)) {
          exception = VException(
            exp,
            ['type-error', 'destructuring-mismatch', 'key-not-found'],
            `Key ${key} from object destructuring expression not found ` +
            'in the object on the right',
          );

          return null;
        }

        const subRight = right.v[key !== null ? key : i];
        ({ scope, exception, notes } = evalCreateOrAssign(
          { scope, exception, notes },
          exp,
          target,
          op,
          subRight,
        ));

        if (exception !== null) {
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

        const accessorEval = evalSubExpression(scope, accessor);
        notes.push(...accessorEval.notes);
        const accessorValue = accessorEval.value;

        if (
          accessorValue.t !== 'string' &&
          accessorValue.t !== 'number'
        ) {
          exception = VException(accessor,
            ['type-error', 'subscript'],
            `Type error: ${accessorValue.t} subscript`,
          );

          return null;
        }

        leftBaseExp = newBase;
        accessChain.unshift(accessorValue.v);

        continue;
      }

      exception = VException(leftBaseExp,
        ['invalid-assignment-target', 'destructuring'],
        // TODO: Don't analyze if failed validation and throw internal
        // error here instead
        `(redundant) Invalid assignment target: ${leftBaseExp.t} ` +
        'expression',
      );

      return null;
    }

    if (accessChain.length === 0 && op === ':=') {
      scope = Scope.add(
        scope,

        // leftExp would also work, but typescript doesn't know
        leftBaseExp.v,

        {
          origin: leftExp,
          data: right,
        },
      );

      return null;
    }

    const existing = ScopeGetExt(scope, leftBaseExp.v);

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
    ): ValidValue | VException {
      const [index, ...newChain] = chain;

      if (index === undefined) {
        return newValue;
      }

      if (oldValue.t === 'object' && typeof index === 'string') {
        // TODO: Improve typing so that typescript knows this can be
        // undefined instead of using its permissive (incorrect) analysis
        // of index typing.
        const oldSubValue = oldValue.v[index];

        if (oldSubValue === undefined && op !== ':=') {
          return VException(leftExp,
            ['key-not-found'],
            // TODO: Better message, location
            'Key not found',
          );
        }

        if (oldSubValue !== undefined && op === ':=') {
          return VException(leftExp,
            ['duplicate', 'duplicate-key'],
            `Trying to add key ${index} that already exists`,
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

        if (newChain.length === 0 && op === ':=') {
          return VException(
            leftExp,
            ['duplicate', 'duplicate-index'],
            `Attempt to add duplicate index ${index} to array (the ` +
            'creation operator := never works with an array subscript ' +
            'on the left)',
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
      right,
    );

    if (newBaseValue.t === 'exception') {
      exception = newBaseValue;
      return null;
    }

    scope = Scope.set(
      scope,
      leftBaseExp.v,
      newBaseValue,
    );

    return null;
  })();

  return { scope, exception, notes };
}

function evalSubExpression(
  scope: Scope.Map<ST>,
  exp: Syntax.Expression
): { value: ValidValue | VException, notes: Note[] } {
  const notes: Note[] = [];

  const value: ValidValue | VException = (() => {
    switch (exp.t) {
      case 'NUMBER': { return VNumber(Number(exp.v)); }
      case 'BOOL': { return VBool(exp.v); }
      case 'NULL': { return VNull(); }
      case 'STRING': { return VString(exp.v.substring(1, exp.v.length - 1)); }

      case 'IDENTIFIER': {
        const entry = ScopeGetExt(scope, exp.v);

        if (entry === null) {
          return VException(
            exp,
            ['not-found'],
            `Variable does not exist: ${exp.v}`
          );
        }

        return entry.data;
      }

      case '+': {
        const opEval = evalVanillaOperator(
          scope,
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
                  return VException(exp,
                    [
                      'analysis',
                      'duplicate',
                      'duplicate-key',
                      'object-addition',
                    ],
                    'Type error: objects cannot be added due to duplicate ' +
                    'key ' + key,
                  );
                }
              }

              if (left.cat === 'concrete' && right.cat === 'concrete') {
                return VConcreteObject({ ...left.v, ...right.v });
              }

              return VObject({ ...left.v, ...right.v });
            }

            const forbiddenTypes: ValidValue['t'][] = [
              'bool',
              'null',
              'func', // TODO: define function addition when appropriate
            ];

            if (
              forbiddenTypes.indexOf(left.t) !== -1 ||
              forbiddenTypes.indexOf(right.t) !== -1
            ) {
              return null;
            }

            if (left.t === 'unknown' || right.t === 'unknown') {
              return VUnknown();
            }

            return null;
          },
        );

        notes.push(...opEval.notes);
        return opEval.value;
      }

      case '*': {
        const opEval = evalVanillaOperator(
          scope,
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

            const forbiddenTypes: ValidValue['t'][] = [
              'bool',
              'null',
              'func', // TODO: define function multiplication when appropriate
            ];

            if (
              forbiddenTypes.indexOf(left.t) !== -1 ||
              forbiddenTypes.indexOf(right.t) !== -1
            ) {
              return null;
            }

            if (left.t === 'unknown' || right.t === 'unknown') {
              return VUnknown();
            }

            return null;
          },
        );

        notes.push(...opEval.notes);
        return opEval.value;
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

        const opEval = evalVanillaOperator(
          scope,
          exp,
          (left, right) => {
            if (left.t === 'number' && right.t === 'number') {
              return VNumber(op(left.v, right.v));
            }

            if (
              (left.t === 'unknown' || right.t === 'unknown') &&
              (left.t === 'number' || right.t === 'number')
            ) {
              return VUnknown();
            }

            return null;
          },
        );

        notes.push(...opEval.notes);
        return opEval.value;
      }

      case '&&':
      case '||': {
        const op: (a: boolean, b: boolean) => boolean = (() => {
          switch (exp.t) {
            case '&&': return (a: boolean, b: boolean) => a && b;
            case '||': return (a: boolean, b: boolean) => a || b;
          }
        })();

        const opEval = evalVanillaOperator(
          scope,
          exp,
          (left, right) => {
            if (left.t === 'bool' && right.t === 'bool') {
              return VBool(op(left.v, right.v));
            }

            if (
              (left.t === 'unknown' || right.t === 'unknown') &&
              (left.t === 'bool' || right.t === 'bool')
            ) {
              return VUnknown();
            }

            return null;
          },
        );

        notes.push(...opEval.notes);
        return opEval.value;
      }

      case '==':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=': {
        const op = exp.t;

        const opEval = evalVanillaOperator(
          scope,
          exp,
          (left, right) => {
            if (left.t === 'unknown' || right.t === 'unknown') {
              return VUnknown();
            }

            if (left.cat === 'valid' || right.cat === 'valid') {
              // (This case is for objects & arrays that have unknowns)
              // TODO: Should be possible to sometimes (often?) determine
              // ordering without concrete array/object.
              return VUnknown();
            }

            return TypedComparison(exp, op, left, right)
          },
        );

        notes.push(...opEval.notes);
        return opEval.value;
      }

      case 'unary -':
      case 'unary +': {
        const right = evalSubExpression(scope, exp.v);
        notes.push(...right.notes);

        if (right.value.t === 'exception' || right.value.t === 'unknown') {
          return right.value;
        }

        if (right.value.t !== 'number') {
          return VException(
            exp,
            ['type-error', 'unary-plus-minus'],
            `Type error: ${exp.t.slice(6)}${right.value.t}`,
          );
        }

        return VNumber(
          exp.t === 'unary -' ?
          -right.value.v :
          +right.value.v
        );
      }

      case 'func': {
        return VFunc({ exp, scope });
      }

      case 'functionCall': {
        const [funcExp, argExps] = exp.v;

        const funcEval = evalSubExpression(scope, funcExp);
        notes.push(...funcEval.notes);
        let func = funcEval.value;

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
            case 'object': {
              return VException(funcExp,
                ['type-error', 'call-non-function'],
                `Type error: attempt to call a ${func.t} as a function`
              );
            }
          }
        })();

        if (func.t === 'exception') {
          return func;
        }

        const args: ValidValue[] = [];

        for (const argExp of argExps) {
          const arg = evalSubExpression(scope, argExp);
          notes.push(...arg.notes);

          if (arg.value.t === 'exception') {
            return arg.value;
          }

          args.push(arg.value);
        }

        return (() => {
          switch (func.t) {
            case 'unknown': {
              // TODO: maybeException?
              return VUnknown();
            }

            case 'func': {
              if (func.v.exp.v.args.length !== args.length) {
                return VException(
                  exp,
                  ['type-error', 'arguments-length-mismatch'],
                  [
                    'Arguments length mismatch: ',
                    Value.String(func),
                    ' requires ',
                    func.v.exp.v.args.length,
                    ' arguments but ',
                    args.length,
                    ' were provided'
                  ].join(''),
                );
              }

              let funcScope = func.v.scope;

              if (func.v.exp.v.name !== null) {
                funcScope = Scope.add(
                  funcScope,
                  func.v.exp.v.name.v,
                  {
                    origin: func.v.exp,
                    data: func,
                  },
                );
              }

              for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                const [argIdentifier] = func.v.exp.v.args[i].v;
                funcScope = Scope.add(
                  funcScope,
                  argIdentifier.v,
                  {
                    origin: argExps[i],
                    data: arg,
                  },
                );
              }

              const body = func.v.exp.v.body;

              if (body.t === 'expBody') {
                const bodyEval = evalSubExpression(funcScope, body.v);
                notes.push(...bodyEval.notes);
                return bodyEval.value;
              }

              let funcCtx: Context = {
                scope: funcScope,
                value: VMissing(),
                notes: [],
              };

              funcCtx = analyzeInContext(funcCtx, true, body, false);

              // TODO: Do some processing with the notes here. Return info
              // should be suppressed (and all infos?) and others should be
              // duplicated at the call site.
              notes.push(...funcCtx.notes);

              if (funcCtx.value.t === 'missing') {
                throw new Error(
                  'Missing value from function call should have been caught ' +
                  'during validation'
                );
              }

              return funcCtx.value;
            }
          }
        })();
      }

      case 'array': {
        const res = VArray([]);
        let arrConcrete = true;

        for (const elExp of exp.v) {
          const elEval = evalSubExpression(scope, elExp);
          notes.push(...elEval.notes);

          const el = elEval.value;

          if (el.t === 'exception') {
            return el;
          }

          if (el.cat !== 'concrete') {
            arrConcrete = false;
          }

          res.v.push(el);
        }

        if (arrConcrete) {
          // TODO: Breaking the type system here, but this should work. What
          // to do here?
          (res as any).cat = 'concrete';
        }

        return res;
      }

      case 'subscript': {
        const [containerExp, indexExp] = exp.v;

        const containerEval = evalSubExpression(scope, containerExp);
        notes.push(...containerEval.notes);
        const container = containerEval.value;

        const indexEval = evalSubExpression(scope, indexExp);
        notes.push(...indexEval.notes);
        const index = indexEval.value;

        if (container.t === 'array') {
          if (index.t !== 'number') {
            return VException(exp,
              ['type-error', 'subscript'],
              `Type error: ${container.t}[${index.t}]`,
            );
          }

          if (index.v < 0 || index.v !== Math.floor(index.v)) {
            return VException(indexExp,
              ['subscript', 'out-of-bounds', 'index-bad'],
              `Invalid array index: ${index.v}`,
            );
          }

          if (index.v >= container.v.length) {
            return VException(
              exp,
              ['out-of-bounds', 'index-too-large'],
              [
                'Out of bounds: index ',
                index.v,
                ' but array is only length ',
                container.v.length
              ].join(''),
            );
          }

          return container.v[index.v];
        }

        if (container.t === 'object') {
          return objectLookup(exp, container, index);
        }

        return VException(exp,
          ['type-error', 'subscript', 'object'],
          `Type error: ${container.t}[${index.t}]`,
        );
      }

      case 'object': {
        const res = VObject({});
        let objConcrete = true;

        for (const [identifierKey, subExp] of exp.v) {
          const subEval = evalSubExpression(scope, subExp);
          notes.push(...subEval.notes);

          const subValue = subEval.value;

          if (subValue.t === 'exception') {
            return subValue;
          }

          if (subValue.cat !== 'concrete') {
            objConcrete = false;
          }

          res.v[identifierKey.v] = subValue;
        }

        if (objConcrete) {
          res.cat = 'concrete';
        }

        return res;
      }

      case '.': {
        const [objExp, keyExp] = exp.v;

        const objEval = evalSubExpression(scope, objExp);
        notes.push(...objEval.notes);
        return objectLookup(exp, objEval.value, VString(keyExp.v));
      }

      case 'switch': {
        const [testExp, cases] = exp.v;

        let testValue: ConcreteValue | null = null;

        if (testExp !== null) {
          const testExpEval = evalSubExpression(scope, testExp);
          notes.push(...testExpEval.notes);

          if (testExpEval.value.t === 'exception') {
            return testExpEval.value;
          }

          if (testExpEval.value.cat !== 'concrete') {
            // TODO: Bailing with unknown here because comparison can't yet
            // handle non-concrete values
            return VUnknown();
          }

          testValue = testExpEval.value;
        }

        for (const [labelExp, resultExp] of cases) {
          const labelExpEval = evalSubExpression(scope, labelExp);
          notes.push(...labelExpEval.notes);

          const labelValue = labelExpEval.value;

          if (labelValue.t === 'exception' || labelValue.t === 'unknown') {
            return labelValue;
          }

          let combinedLabelValue: ValidValue | VException = labelValue;

          if (testValue !== null) {
            if (labelValue.cat !== 'concrete') {
              // TODO: Bailing with unknown here because comparison can't yet
              // handle non-concrete values
              return VUnknown();
            }

            if (!SameType(testValue, labelValue)) {
              continue;
            }

            combinedLabelValue = TypedEqual(
              labelExp,
              testValue,
              labelValue
            );

            if (combinedLabelValue.t === 'exception') {
              // TODO: If it somehow did generate an exception, labelExp is
              // the wrong reference expression to pass into TypedEqual. Need
              // a better solution here.
              throw new Error('Shouldn\'t be possible to get here');
            }
          }

          if (combinedLabelValue.t !== 'bool') {
            if (testValue !== null) {
              // If the test value is present, it shouldn't be possible to get
              // a non-bool here. This check is here because the diagnostic
              // generated below assumes the switch lacks a test value.
              throw new Error('Shouldn\'t be possible');
            }

            return VException(
              labelExp,
              ['type-error', 'non-bool-switch-case'],
              `Switch case was type {${labelValue.t}} instead of {bool}`,
            );
          }

          if (combinedLabelValue.v === true) {
            const resultExpEval = evalSubExpression(scope, resultExp);
            notes.push(...resultExpEval.notes);
            return resultExpEval.value;
          }
        }

        // TODO: Often the analyzer should be producing error notes and
        // continuing with an unknown instead of an exception. This is
        // definitely one of those cases.
        return VException(
          exp,
          ['analysis', 'incomplete-switch', 'value-needed'],
          'Switch did not handle every possibility',
        );
      }

      case 'methodCall':
      case 'class':
      case 'import': {
        return VException(
          exp,
          ['not-implemented'],
          `Not implemented: ${exp.t} expression`,
        );
      }

      case ':=':
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
      case '++':
      case '--': {
        throw new Error(
          'Mutation operator in subexpression should have been caught ' +
          'during validation.'
        );
      }
    }
  })();

  return { value, notes };
}

function evalVanillaOperator<T extends {
  t: Syntax.NonSpecialBinaryOperator,
  v: [Syntax.Expression, Syntax.Expression],
  p: Syntax.Pos
}>(
  scope: Scope.Map<ST>,
  exp: T,
  combine: (a: ValidValue, b: ValidValue) => ValidValue | VException | null,
): { value: ValidValue | VException, notes: Note[] } {
  const notes: Note[] = [];

  const left = evalSubExpression(scope, exp.v[0]);
  notes.push(...left.notes);

  if (left.value.t === 'exception') {
    return { value: left.value, notes };
  }

  const right = evalSubExpression(scope, exp.v[1]);
  notes.push(...right.notes);

  if (right.value.t === 'exception') {
    return { value: right.value, notes };
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

  return { value, notes };
}

function ExpressionString(
  scope: Scope.Map<ST>,
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
      const { value } = evalSubExpression(scope, exp);
      return Value.String(value);
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
