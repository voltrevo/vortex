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

export function VBlank(): Value {
  return VUnknown();
}

export type FuncRef = {
  cat: 'ref';
  t: 'func-ref';
  v: Syntax.FunctionExpression;
};

export type ImportRef = {
  cat: 'ref';
  t: 'import-ref';
  v: Syntax.Import;
};

export type RefValue = (
  FuncRef |
  ImportRef |
  never
);

export type Outcome = Value | Exception;
export function MaybeOutcome(): Outcome | null { return null; }

export type Module_ = (
  {
    loaded: true,
    program: Syntax.Program;
    outcome: null | Outcome;
    notes: Note[],
  } |
  {
    loaded: false,
    program: null;
    outcome: VUnknown;
  } |
  never
);

export type VFunc = {
  cat: 'concrete';
  t: 'func';
  v: {
    exp: Syntax.FunctionExpression;
    az: Analyzer;
  };
};

export function VFunc(v: {
  exp: Syntax.FunctionExpression;
  az: Analyzer;
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

type VValidArray = { cat: 'valid', t: 'array', v: Value[] };

export type VArray = (
  VConcreteArray |
  VValidArray |
  never
);

export function VArray(v: Value[]): VValidArray {
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
    v: { [key: string]: Value },
  } |
  never
);

export function VObject(v: { [key: string]: Value }): VObject {
  return { cat: 'valid', t: 'object', v };
}

export type VUnknown = { cat: 'valid', t: 'unknown', v: null };

function VUnknown(): VUnknown {
  return { cat: 'valid', t: 'unknown', v: null };
}

export type Exception = {
  cat: 'invalid';
  t: 'exception';
  v: {
    origin: Syntax.Element;
    tags: Note.Tag[];
    message: string;
  };
}

function Exception(
  origin: Syntax.Element,
  tags: Note.Tag[],
  message: string
): Exception {
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

export type Value = (
  ConcreteValue |
  VArray |
  VObject |
  VUnknown |
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
): VBool | Exception {
  if (!SameType(left, right)) {
    return Exception(exp,
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
): VBool | Exception {
  const sameType = SameType(left, right);

  if (sameType.v === false) {
    return Exception(exp,
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
      return Exception(exp,
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

function InvertIfBool<V extends Outcome>(x: V): V {
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
): VBool | Exception {
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
  export function String(v: Outcome): string {
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
): VObject | Exception {
  if (n.v === 0) {
    return VConcreteObject({});
  }

  if (n.v === 1) {
    return obj;
  }

  if (Object.keys(obj.v).length === 0) {
    return obj;
  }

  return Exception(exp,
    ['object-multiplication'],
    `Attempt to multiply non-empty object by ${n.v} (can only multiply ` +
    'non-empty objects by 0 or 1)',
  );
}

function objectLookup(
  exp: Syntax.Expression,
  obj: Value,
  index: Value,
): Outcome {
  if (
    (obj.t !== 'object' && obj.t !== 'unknown') ||
    (index.t !== 'string' && index.t !== 'unknown')
  ) {
    return Exception(exp,
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
    return Exception(exp,
      ['key-not-found'],
      `Object key not found: ${index.v}`,
    );
  }

  return maybeValue;
}

export type Analyzer = {
  pack: Package;
  file: string;
  importPath: string[];
  modules: {
    [f: string]: Module_ | undefined;
  };
  scope: Analyzer.ScopeMapT;
};

export function Analyzer(pack: Package, file: string): Analyzer {
  const modules: Analyzer['modules'] = {};

  for (const dep of Object.keys(pack.modules)) {
    const depEntry = pack.modules[dep];

    if (depEntry === undefined || depEntry.t === 'ParserNotes') {
      modules[dep] = {
        loaded: false,
        program: null,
        outcome: VUnknown(),
      };

      continue;
    }

    modules[dep] = {
      loaded: true,
      program: depEntry.program,
      outcome: null,
      notes: [],
    };
  }

  return {
    pack,
    file,
    importPath: [],
    modules,
    scope: Analyzer.ScopeMapT(),
  };
}

export type ValueEntry = {
  origin: Syntax.Element,
  data: Value,
};

export namespace Analyzer {
  export type ST = {
    root: {};
    entry: {
      origin: Syntax.Element;
      data: Value | RefValue;
    };
  };

  export type ScopeT = Scope<ST>;
  export type ScopeMapT = Scope.Map<ST>;
  export type ScopeRootT = Scope.Root<ST>;

  export function ScopeMapT(): ScopeMapT {
    return Scope.Map<ST>({});
  }

  export function get(
    az: Analyzer,
    name: string,
  ): [ValueEntry | null, Analyzer] {
    const entry = Scope.get(az.scope, name);

    if (entry === null) {
      return [null, az];
    }

    if (entry.data.cat !== 'ref') {
      // The intention is {return [entry, az]} but a limitation in typescript
      // requires it to be reconstructed like this.
      const entryCopy = {
        origin: entry.origin,
        data: entry.data,
      };

      return [entryCopy, az];
    }

    let mo = MaybeOutcome();

    checkNull((() => {
      switch (entry.data.t) {
        case 'func-ref': {
          mo = VFunc({ exp: entry.data.v, az });
          return null;
        }

        case 'import-ref': {
          [mo, az] = retrieveImport(
            az,
            entry.data.v,
          );

          if (mo.cat === 'invalid') {
            throw new Error(
              'Unable to handle invalid value from import. This possibility ' +
              'should be prevented before here but currently it can happen.'
            );
          }

          return null;
        }
      }
    })());

    if (mo === null || mo.t === 'exception') {
      throw new Error('Shouldn\'t be possible');
    }

    const out = {
      origin: entry.origin,
      data: mo,
    };

    return [out, az];
  }

  export function set(
    az: Analyzer,
    name: string,
    mods: Partial<ST['entry']['data']>,
  ): Analyzer {
    return { ...az,
      scope: Scope.set(az.scope, name, mods),
    };
  }

  export function add(
    analyzer: Analyzer,
    name: string,
    entry: ST['entry'],
  ): Analyzer {
    return { ...analyzer,
      scope: Scope.add(analyzer.scope, name, entry),
    };
  }

  export function push(
    analyzer: Analyzer,
  ): Analyzer {
    return { ...analyzer,
      scope: Scope.push(analyzer.scope),
    };
  }

  export function pop(
    analyzer: Analyzer,
  ): Analyzer {
    const newScope = Scope.pop(analyzer.scope);

    if ('root' in newScope) {
      throw new Error('Shouldn\'t be possible');
    }

    return { ...analyzer,
      scope: newScope,
    };
  }

  export function addNote(
    analyzer: Analyzer,
    note: Note,
  ): Analyzer {
    let module_ = analyzer.modules[analyzer.file];

    if (module_ === undefined || !module_.loaded) {
      throw new Error('Shouldn\'t be possible');
    }

    module_ = { ...module_,
      notes: [...module_.notes,
        { ...note,
          tags: ['analyzer', ...note.tags],
        },
      ],
    };

    return { ...analyzer,
      modules: { ...analyzer.modules,
        [analyzer.file]: module_,
      },
    };
  }

  export function setModule(
    az: Analyzer,
    outcome: Outcome,
  ): [Module_, Analyzer] {
    if (outcome.t === 'exception') {
      az = addNote(az, Note(
        outcome.v.origin,
        'error',
        ['exception', ...outcome.v.tags],
        'Threw exception: ' + outcome.v.message,
      ));
    }

    const existing = az.modules[az.file];

    if (existing === undefined || existing.loaded === false) {
      throw new Error('Shouldn\'t be possible');
    }

    const mod = { ...existing, outcome };

    az = { ...az,
      modules: { ...az.modules,
        [az.file]: mod,
      },
    };

    return [mod, az];
  }

  export function run(az: Analyzer): [Module_, Analyzer] {
    const moduleEntry = az.pack.modules[az.file];

    if (moduleEntry === undefined || moduleEntry.t === 'ParserNotes') {
      throw new Error('Shouldn\'t be possible');
    }

    let out: Outcome;
    [out, az] = analyzeBody(az, moduleEntry.program);

    let mod: Module_;
    [mod, az] = setModule(az, out);

    return [mod, az];
  }
}

function analyzeBody(
  az: Analyzer,
  program: Syntax.Program,
): [Outcome, Analyzer] {
  let mout: Outcome | null;
  [mout, az] = analyzeBlock(az, program);

  if (mout === null) {
    throw new Error('Shouldn\'t be possible');
  }

  return [mout, az];
}

function analyzeBlock(
  az: Analyzer,
  program: Syntax.Program,
): [Outcome | null, Analyzer] {
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

    az = Analyzer.add(az, hoist.v.name.v, {
      origin: hoist,
      data: {
        cat: 'ref',
        t: 'func-ref',
        v: hoist,
      },
    });
  }

  let mout = MaybeOutcome();

  for (const statement of statements) {
    [mout, az] = analyzeStatement(az, statement);

    if (mout !== null) {
      break;
    }
  }

  return [mout, az];
}

function analyzeStatement(
  az: Analyzer,
  statement: Syntax.Statement,
): [Outcome | null, Analyzer] {
  switch (statement.t) {
    case 'e': {
      return analyzeTopExpression(az, statement.v);
    }

    case 'return': {
      return analyzeSubExpression(az, statement.v);
    }

    case 'assert': {
      let out: Outcome;
      [out, az] = analyzeSubExpression(az, statement.v);

      if (out.t === 'exception') {
        return [out, az];
      }

      if (out.t === 'unknown') {
        // TODO!: maybeException handling, treat as unknown as error
        // sometimes
        return [out, az];
      }

      if (out.t !== 'bool') {
        az = Analyzer.addNote(az, Note(
          statement.v,
          'error',
          ['type-error', 'assert-non-bool'],
          `Type error: assert ${out.t}`,
        ));

        return [out, az];
      }

      if (out.v === false) {
        // TODO: Format code for other exceptions like this
        const ex = Exception(statement.v,
          ['assert-false'],
          `Asserted ${ExpressionString(az, statement.v)}`,
        );

        return [ex, az];
      }

      return [null, az];
    }

    case 'if': {
      const [cond, block] = statement.v;
      let condOut: Outcome;
      [condOut, az] = analyzeSubExpression(az, cond);

      if (condOut.t === 'exception') {
        return [condOut, az];
      }

      // TODO: unknown -> maybeException?

      if (condOut.t !== 'bool') {
        const ex = Exception(cond,
          ['non-bool-condition', 'if-condition'],
          `Type error: Non-bool condition: ${condOut.t}`,
        );

        return [ex, az];
      }

      if (condOut.v === true) {
        az = Analyzer.push(az);
        let blockOut: Outcome | null;
        [blockOut, az] = analyzeBlock(az, block);
        az = Analyzer.pop(az);

        if (blockOut !== null) {
          return [blockOut, az];
        }
      }

      return [null, az];
    }

    case 'for': {
      const { control, block } = statement.v;

      // TODO: Impure function - captures and contributes az mutations
      function cond(): VBool | Exception {
        if (
          control !== null &&
          control.t !== 'condition' &&
          control.t !== 'setup; condition; next'
        ) {
          const ex = Exception(
            statement,
            ['not-implemented', 'for-control'],
            // TODO: Need to capture more structure in compiler notes
            `Not implemented: for loop with (${control.t}) control clause`,
          );

          return ex;
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

        let condOut: Outcome;
        [condOut, az] = analyzeSubExpression(az, condExp);

        if (condOut.t !== 'bool') {
          const ex = Exception(
            condExp,
            ['non-bool-condition', 'for-condition'],
            `Type error: Non-bool condition: ${condOut.t}`,
          );

          return ex;
        }

        return condOut;
      }

      az = Analyzer.push(az);

      if (control && control.t === 'setup; condition; next') {
        const [setup] = control.v;
        let setupEx: Exception | null;
        [setupEx, az] = analyzeTopExpression(az, setup);

        if (setupEx !== null) {
          return [setupEx, az];
        }
      }

      let iterations = 0;
      let mout = MaybeOutcome();

      while (true) {
        const condOut = cond(); // mutates az

        if (condOut.t === 'exception') {
          return [condOut, az];
        }

        // TODO: Note counting, deduplication with if

        // TODO: unknown -> maybeException?

        if (condOut.v === false) {
          break;
        }

        az = Analyzer.push(az);
        [mout, az] = analyzeBlock(az, block);

        if (
          mout === null &&
          control &&
          control.t === 'setup; condition; next'
        ) {
          const [, , next] = control.v;
          [mout, az] = analyzeTopExpression(az, next);
        }

        az = Analyzer.pop(az);

        iterations++;

        if (mout !== null) {
          break;
        }

        if (iterations >= 2048) {
          // TODO: Count total operations and limit execution based on that
          // instead.
          az = Analyzer.addNote(az, Note(statement,
            'warn',
            ['iteration-limit'],
            'Hit iteration limit of 2048',
          ));

          // Maybe exception?
          mout = VUnknown();
          break;
        }
      }

      az = Analyzer.pop(az);

      return [mout, az];
    }

    case 'import': {
      const [importIdentifier] = statement.v;

      az = Analyzer.add(az, importIdentifier.v, {
        origin: importIdentifier,
        data: {
          cat: 'ref',
          t: 'import-ref',
          v: statement,
        },
      });

      return [null, az];
    }

    case 'break':
    case 'continue': {
      const ex = Exception(
        statement,
        // TODO: Need to capture more structure in compiler notes
        ['not-implemented'],
        `Not implemented: ${statement.t} statement`,
      );

      return [ex, az];
    }
  }
}

function retrieveImport(
  az: Analyzer,
  import_: Syntax.Import
): [Outcome, Analyzer] {
  const resolved = Package.resolveImport(az.file, import_);

  if (typeof resolved !== 'string') {
    const ex = Exception(
      import_,
      ['not-found'], // TODO: extra tag
      'Import not found: ' + resolved,
    );

    return [ex, az];
  }

  const entry = az.modules[resolved];

  if (entry === undefined) {
    if (resolved.split('/')[0] === '@') {
      throw new Error('Shouldn\'t be possible');
    }

    const ex = Exception(
      import_,
      ['not-implemented'],
      'Not implemented: external packages',
    );

    return [ex, az];
  }

  // This case would be handled nicely by @below but typescript
  // has a limitation which necessitates handling it here
  if (entry.program === null) {
    if (entry.outcome === null) {
      // Related to the issue above, typescript really ought to know
      // this
      throw new Error('Shouldn\'t be possible');
    }

    return [entry.outcome, az];
  }

  // @below
  if (entry.outcome !== null) {
    return [entry.outcome, az];
  }

  // TODO: This manouvre is weird. Need to use scope concept again I think.
  const [entryMod, entryAz] = Analyzer.run({ ...az, file: resolved });
  az = { ...entryAz, file: az.file };

  if (entryMod.outcome === null) {
    throw new Error('Shouldn\'t be possible');
  }

  return [entryMod.outcome, az];
}

function analyzeTopExpression(
  az: Analyzer,
  exp: Syntax.Expression,
): [Exception | null, Analyzer] {
  let mex: Exception | null = null;

  checkNull((() => {
    switch (exp.t) {
      // TODO: Support more compound assignment operators
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

        let right: Outcome;
        [right, az] = analyzeSubExpression(az, rightExp);

        if (right.t === 'exception') {
          mex = right;
          return null;
        }

        [mex, az] = analyzeCreateOrAssign(
          az,
          exp,
          leftExp,
          exp.t === ':=' ? ':=' : '=',
          right,
        );

        return null;
      }

      case '--':
      case '++': {
        const subExp = exp.v;

        let out: Outcome;
        [out, az] = analyzeSubExpression(az, subExp);

        if (out.t === 'exception') {
          mex = out;
          return null;
        }

        if (out.t !== 'number') {
          mex = Exception(
            subExp,
            ['type-error', 'inc-dec'],
            `Type error: ${out.t}${exp.t}`,
          );

          return null;
        }

        if (subExp.t !== 'IDENTIFIER') {
          mex = Exception(
            exp,
            ['not-implemented', 'non-identifier-assignment-target'],
            `Not implemented: non-identifier lvalues`,
          );

          return null;
        }

        const newValue = {
          t: 'number' as 'number',
          v: out.v + (exp.t === '++' ? 1 : -1)
        };

        az = Analyzer.set(az, subExp.v, newValue);

        return null;
      }

      case 'func': {
        const func = VFunc({ exp, az });

        if (!exp.topExp) {
          // TODO: Enforce this by typing?
          throw new Error('Shouldn\'t be possible');
        }

        if (exp.v.name) {
          az = Analyzer.add(az, exp.v.name.v, {
            origin: exp,
            data: func,
          });
        }

        return null;
      }

      case 'class': {
        mex = Exception(
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

      // Well, this is a top expression but it's processed as a statement, does
      // it really belong here? Something is up TODO.
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

  return [mex, az];
}

function analyzeCreateOrAssign(
  az: Analyzer,
  exp: Syntax.Expression,
  leftExp: Syntax.Expression,
  op: '=' | ':=',
  right: Value,
): [Exception | null, Analyzer] {
  let mex: Exception | null = null;

  if (leftExp.t === 'array' || leftExp.t === 'object') {
    // TODO: Fail earlier / in a more informative way when attempting a
    // destructuring and compound assignment simultaneously?

    // TODO: Unknown should also work
    if (right.t !== leftExp.t) {
      mex = Exception(exp,
        ['type-error', 'destructuring-mismatch'],
        // TODO: a vs an
        `Assignment target is an ${leftExp.t} but the value is a ` +
        right.t
      );

      return [mex, az];
    }

    if (right.cat !== 'concrete') {
      mex = Exception(exp,
        ['type-error', 'destructuring-mismatch'],
        // TODO: This is wrong / implement proper unknown handling here
        'Assignment target is an array but the value is unknown',
      );

      return [mex, az];
    }

    const numRightValues = (
      right.t === 'array' ?
      right.v.length :
      Object.keys(right.v).length
    );

    if (leftExp.v.length !== numRightValues) {
      // TODO: Implement _ as special ignore identifier
      // TODO: Customize message for object destructuring?
      mex = Exception(
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

      return [mex, az];
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
        mex = Exception(
          exp,
          ['type-error', 'destructuring-mismatch', 'key-not-found'],
          `Key ${key} from object destructuring expression not found ` +
          'in the object on the right',
        );

        return [mex, az];
      }

      const subRight = right.v[key !== null ? key : i];

      [mex, az] = analyzeCreateOrAssign(
        az,
        exp,
        target,
        op,
        subRight,
      );

      if (mex !== null) {
        return [mex, az];
      }
    }

    return [mex, az];
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

      let acc: Outcome;
      [acc, az] = analyzeSubExpression(az, accessor);

      if (acc.t === 'exception') {
        return [acc, az];
      }

      if (
        acc.t !== 'string' &&
        acc.t !== 'number'
      ) {
        mex = Exception(accessor,
          ['type-error', 'subscript'],
          `Type error: ${acc.t} subscript`,
        );

        return [mex, az];
      }

      leftBaseExp = newBase;
      accessChain.unshift(acc.v);

      continue;
    }

    mex = Exception(leftBaseExp,
      ['invalid-assignment-target', 'destructuring'],
      // TODO: Don't analyze if failed validation and throw internal
      // error here instead
      `(redundant) Invalid assignment target: ${leftBaseExp.t} ` +
      'expression',
    );

    return [mex, az];
  }

  if (accessChain.length === 0 && op === ':=') {
    az = Analyzer.add(
      az,

      // leftExp would also work, but typescript doesn't know
      leftBaseExp.v,

      {
        origin: leftExp,
        data: right,
      },
    );

    return [null, az];
  }

  let existing: ValueEntry | null;
  [existing, az] = Analyzer.get(az, leftBaseExp.v);

  if (existing === null) {
    throw new Error('Shouldn\'t be possible');
  }

  function modifyChain(
    oldValue: Value,
    chain: (string | number)[],
    newValue: Value,
  ): Outcome {
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
        return Exception(leftExp,
          ['key-not-found'],
          // TODO: Better message, location
          'Key not found',
        );
      }

      if (oldSubValue !== undefined && op === ':=') {
        return Exception(leftExp,
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
        return Exception(leftExp,
          ['out-of-bounds', 'index-bad'],
          `Invalid index: ${index}`,
        );
      }

      if (index >= oldValue.v.length) {
        // TODO: More accurate expression reference (just providing
        // entire lhs instead of specifically the bad subscript/.)
        return Exception(
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
        return Exception(
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
    return Exception(leftExp,
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
    mex = newBaseValue;
    return [mex, az];
  }

  az = Analyzer.set(
    az,
    leftBaseExp.v,
    newBaseValue,
  );

  return [null, az];
}

function analyzeSubExpression(
  az: Analyzer,
  exp: Syntax.Expression
): [Outcome, Analyzer] {
  switch (exp.t) {
    case 'NUMBER': { return [VNumber(Number(exp.v)), az]; }
    case 'BOOL': { return [VBool(exp.v), az]; }
    case 'NULL': { return [VNull(), az]; }

    case 'STRING': {
      return [VString(exp.v.substring(1, exp.v.length - 1)), az];
    }

    case 'IDENTIFIER': {
      let entry: ValueEntry | null;
      [entry, az] = Analyzer.get(az, exp.v);

      if (entry === null) {
        const ex = Exception(
          exp,
          ['not-found'],
          `Variable does not exist: ${exp.v}`
        );

        return [ex, az];
      }

      return [entry.data, az];
    }

    case '+': {
      return analyzeVanillaOperator(
        az,
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
                return Exception(exp,
                  [
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

          const forbiddenTypes: Value['t'][] = [
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
    }

    case '*': {
      return analyzeVanillaOperator(
        az,
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

          const forbiddenTypes: Value['t'][] = [
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

      return analyzeVanillaOperator(
        az,
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
    }

    case '&&':
    case '||': {
      const op: (a: boolean, b: boolean) => boolean = (() => {
        switch (exp.t) {
          case '&&': return (a: boolean, b: boolean) => a && b;
          case '||': return (a: boolean, b: boolean) => a || b;
        }
      })();

      return analyzeVanillaOperator(
        az,
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
    }

    case '==':
    case '!=':
    case '<':
    case '>':
    case '<=':
    case '>=': {
      const op = exp.t;

      return analyzeVanillaOperator(
        az,
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
    }

    case 'unary -':
    case 'unary +': {
      let right: Outcome;
      [right, az] = analyzeSubExpression(az, exp.v);

      if (right.t === 'exception' || right.t === 'unknown') {
        return [right, az];
      }

      if (right.t !== 'number') {
        const ex = Exception(
          exp,
          ['type-error', 'unary-plus-minus'],
          `Type error: ${exp.t.slice(6)}${right.t}`,
        );

        return [ex, az];
      }

      const out = VNumber(right.v * (exp.t === 'unary -' ? -1 : 1));
      return [out, az];
    }

    case 'func': {
      return [VFunc({ exp, az }), az];
    }

    case 'functionCall': {
      const [funcExp, argExps] = exp.v;

      let func: Outcome;
      [func, az] = analyzeSubExpression(az, funcExp);

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
            return Exception(funcExp,
              ['type-error', 'call-non-function'],
              `Type error: attempt to call a ${func.t} as a function`
            );
          }
        }
      })();

      if (func.t === 'exception') {
        return [func, az];
      }

      const args: Value[] = [];

      for (const argExp of argExps) {
        let arg: Outcome;
        [arg, az] = analyzeSubExpression(az, argExp);

        if (arg.t === 'exception') {
          return [arg, az];
        }

        args.push(arg);
      }

      let out = MaybeOutcome();

      checkNull((() => {
        switch (func.t) {
          case 'unknown': {
            // TODO: maybeException?
            out = VUnknown();
            return null;
          }

          case 'func': {
            if (func.v.exp.v.args.length !== args.length) {
              const ex = Exception(
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

              out = ex;
              return null;
            }

            let funcAz = { ...func.v.az, modules: az.modules };

            if (func.v.exp.v.name !== null) {
              funcAz = Analyzer.add(
                funcAz,
                func.v.exp.v.name.v,
                {
                  origin: func.v.exp,
                  data: func,
                },
              );
            }

            for (let i = 0; i < args.length; i++) {
              // TODO: Argument destructuring
              const arg = args[i];
              const [argIdentifier] = func.v.exp.v.args[i].v;

              funcAz = Analyzer.add(
                funcAz,
                argIdentifier.v,
                {
                  origin: argExps[i],
                  data: arg,
                },
              );
            }

            const body = func.v.exp.v.body;

            if (body.t === 'expBody') {
              [out, funcAz] = analyzeSubExpression(funcAz, body.v);
              az = { ...az, modules: funcAz.modules };
            } else {
              [out, funcAz] = analyzeBody(funcAz, body);
              az = { ...az, modules: funcAz.modules };
            }

            // TODO: Do some processing with the notes here so that they have
            // subnotes for stack levels.

            return null;
          }
        }
      })());

      if (out === null) {
        throw new Error('Shouldn\'t be possible');
      }

      return [out, az];
    }

    case 'array': {
      const res = VArray([]);
      let arrConcrete = true;

      for (const elExp of exp.v) {
        let el: Outcome;
        [el, az] = analyzeSubExpression(az, elExp);

        if (el.t === 'exception') {
          return [el, az];
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

      return [res, az];
    }

    case 'subscript': {
      const [containerExp, indexExp] = exp.v;

      let container: Outcome;
      [container, az] = analyzeSubExpression(az, containerExp);

      if (container.t === 'exception') {
        return [container, az];
      }

      let index: Outcome;
      [index, az] = analyzeSubExpression(az, indexExp);

      if (index.t === 'exception') {
        return [index, az];
      }

      if (container.t === 'array') {
        if (index.t !== 'number') {
          const ex = Exception(exp,
            ['type-error', 'subscript'],
            `Type error: ${container.t}[${index.t}]`,
          );

          return [ex, az];
        }

        if (index.v < 0 || index.v !== Math.floor(index.v)) {
          const ex = Exception(indexExp,
            ['subscript', 'out-of-bounds', 'index-bad'],
            `Invalid array index: ${index.v}`,
          );

          return [ex, az];
        }

        if (index.v >= container.v.length) {
          const ex = Exception(
            exp,
            ['out-of-bounds', 'index-too-large'],
            [
              'Out of bounds: index ',
              index.v,
              ' but array is only length ',
              container.v.length
            ].join(''),
          );

          return [ex, az];
        }

        const out = container.v[index.v];
        return [out, az];
      }

      if (container.t === 'object') {
        const out = objectLookup(exp, container, index);
        return [out, az];
      }

      const ex = Exception(exp,
        ['type-error', 'subscript', 'object'],
        `Type error: ${container.t}[${index.t}]`,
      );

      return [ex, az];
    }

    case 'object': {
      const res = VObject({});
      let objConcrete = true;

      for (const [identifierKey, subExp] of exp.v) {
        let sub: Outcome;
        [sub, az] = analyzeSubExpression(az, subExp);

        if (sub.t === 'exception') {
          return [sub, az];
        }

        if (sub.cat !== 'concrete') {
          objConcrete = false;
        }

        res.v[identifierKey.v] = sub;
      }

      if (objConcrete) {
        res.cat = 'concrete';
      }

      return [res, az];
    }

    case '.': {
      const [objExp, keyExp] = exp.v;

      let obj: Outcome;
      [obj, az] = analyzeSubExpression(az, objExp);

      if (obj.t === 'exception') {
        return [obj, az];
      }

      const out = objectLookup(exp, obj, VString(keyExp.v));
      return [out, az];
    }

    case 'switch': {
      const [testExp, cases] = exp.v;

      let testValue: ConcreteValue | null = null;

      if (testExp !== null) {
        let testOut: Outcome;
        [testOut, az] = analyzeSubExpression(az, testExp);

        if (testOut.t === 'exception') {
          return [testOut, az];
        }

        if (testOut.cat !== 'concrete') {
          // TODO: Bailing with unknown here because comparison can't yet
          // handle non-concrete values
          return [VUnknown(), az];
        }

        testValue = testOut;
      }

      for (const [labelExp, resultExp] of cases) {
        let label: Outcome;
        [label, az] = analyzeSubExpression(az, labelExp);

        if (label.t === 'exception' || label.t === 'unknown') {
          return [label, az];
        }

        let combinedLabelValue: Outcome = label;

        if (testValue !== null) {
          if (label.cat !== 'concrete') {
            // TODO: Bailing with unknown here because comparison can't yet
            // handle non-concrete values
            return [VUnknown(), az];
          }

          if (!SameType(testValue, label)) {
            continue;
          }

          combinedLabelValue = TypedEqual(
            labelExp,
            testValue,
            label
          );

          if (combinedLabelValue.t === 'exception') {
            // TODO: If it somehow did generate an exception, labelExp was
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

          const ex = Exception(
            labelExp,
            ['type-error', 'non-bool-switch-case'],
            `Switch case was type {${label.t}} instead of {bool}`,
          );

          return [ex, az];
        }

        if (combinedLabelValue.v === true) {
          return analyzeSubExpression(az, resultExp);
        }
      }

      // TODO: Often the analyzer should be producing error notes and
      // continuing with an unknown instead of an exception. This is
      // definitely one of those cases.
      const ex = Exception(
        exp,
        ['incomplete-switch'],
        'Switch did not handle every possibility',
      );

      return [ex, az];
    }

    case 'import': {
      return retrieveImport(az, exp);
    }

    case 'methodCall':
    case 'class': {
      const ex = Exception(
        exp,
        ['not-implemented'],
        `Not implemented: ${exp.t} expression`,
      );

      return [ex, az];
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
}

function analyzeVanillaOperator<T extends {
  t: Syntax.NonSpecialBinaryOperator,
  v: [Syntax.Expression, Syntax.Expression],
  p: Syntax.Pos
}>(
  az: Analyzer,
  exp: T,
  combine: (a: Value, b: Value) => Outcome | null,
): [Outcome, Analyzer] {
  let left: Outcome;
  [left, az] = analyzeSubExpression(az, exp.v[0]);

  if (left.t === 'exception') {
    return [left, az];
  }

  let right: Outcome;
  [right, az] = analyzeSubExpression(az, exp.v[1]);

  if (right.t === 'exception') {
    return [right, az];
  }

  let value = combine(left, right);

  if (value === null) {
    // TODO: Combine should return something more informative than null to
    // indicate that a type error should result.
    value = Exception(
      exp,
      ['type-error', 'operator'],
      `Type error: ${left.t} ${exp.t} ${right.t}`,
    );
  }

  return [value, az];
}

function ExpressionString(
  analyzer: Analyzer,
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
      const [value] = analyzeSubExpression(analyzer, exp);
      return Value.String(value);
    }

    default: {
      const [left, right] = exp.v;
      return [
        '(',
        ExpressionString(analyzer, left),
        ` ${exp.t} `,
        ExpressionString(analyzer, right),
        ')'
      ].join('');
    }
  }
}
