import Analyzer from '.';
import Note from '../Note';
import Syntax from '../parser/Syntax';

type Outcome = Outcome.Value | Outcome.Exception;
const JsObject = Object;
const JsArray = Array;

namespace Outcome {
  export type String = { cat: 'concrete', t: 'String', v: string };

  export function String(v: string): String {
    return { cat: 'concrete', t: 'String', v };
  }

  export namespace String {
    export function escape(s: string) {
      return s.replace(/'|\\/g, m => '\\' + m);
    }

    export function unescape(s: string) {
      return s.replace(/\\./g, m => m[1]);
    }

    export type MethodMap = {
      Length: {
        base: String;
        name: 'Length';
        argLength: 0;
      };
      String: {
        base: String;
        name: 'String';
        argLength: 0;
      };
    };

    export type Method = MethodMap[keyof MethodMap];

    export type MethodCallMap = {
      String: {
        args: [];
        result: String;
      };
      Length: {
        args: [];
        result: Number;
      };
    };

    export const methodImpls: {
      [name in keyof MethodMap]: MethodImpl<
        MethodMap[name],
        MethodCallMap[name]
      >;
    } = {
      Length: (base, args) => Number(base.v.length),
      String: (base, args) => String('\'' + escape(base.v) + '\''),
    };

    export const methodArgLengths: {
      [name in keyof MethodMap]: MethodMap[name]['argLength'];
    } = {
      Length: 0,
      String: 0,
    };
  }

  export type Number = { cat: 'concrete', t: 'Number', v: number };

  export function Number(v: number): Number {
    return { cat: 'concrete', t: 'Number', v };
  }

  export namespace Number {
    export type MethodMap = {
      String: {
        base: Number;
        name: 'String';
        argLength: 0;
      };
    };

    export type Method = MethodMap[keyof MethodMap];

    export type MethodCallMap = {
      String: {
        args: [];
        result: String;
      };
    };

    export const methodImpls: {
      [name in keyof MethodMap]: MethodImpl<
        MethodMap[name],
        MethodCallMap[name]
      >;
    } = {
      String: (base, args) => String(base.v.toString()),
    };

    export const methodArgLengths: {
      [name in keyof MethodMap]: MethodMap[name]['argLength'];
    } = {
      String: 0,
    };
  }

  export type Bool = { cat: 'concrete', t: 'Bool', v: boolean };

  export function Bool(v: boolean): Bool {
    return { cat: 'concrete', t: 'Bool', v };
  }

  export namespace Bool {
    export type MethodMap = {
      String: {
        base: Bool;
        name: 'String';
        argLength: 0;
      };
    };

    export type Method = MethodMap[keyof MethodMap];

    export type MethodCallMap = {
      String: {
        args: [];
        result: String;
      };
    };

    export const methodImpls: {
      [name in keyof MethodMap]: MethodImpl<
        MethodMap[name],
        MethodCallMap[name]
      >;
    } = {
      String: (base, args) => String(base.v.toString()),
    };

    export const methodArgLengths: {
      [name in keyof MethodMap]: MethodMap[name]['argLength'];
    } = {
      String: 0,
    };
  }

  export type Null = { cat: 'concrete', t: 'Null', v: null };

  export function Null(): Null {
    return { cat: 'concrete', t: 'Null', v: null };
  }

  export namespace Null {
    export type MethodMap = {
      String: {
        base: Null;
        name: 'String';
        argLength: 0;
      };
    };

    export type Method = MethodMap[keyof MethodMap];

    export type MethodCallMap = {
      String: {
        args: [];
        result: String;
      };
    };

    export const methodImpls: {
      [name in keyof MethodMap]: MethodImpl<
        MethodMap[name],
        MethodCallMap[name]
      >;
    } = {
      String: (base, args) => String('null'),
    };

    export const methodArgLengths: {
      [name in keyof MethodMap]: MethodMap[name]['argLength'];
    } = {
      String: 0,
    };
  }

  export type ConcreteArray = {
    cat: 'concrete',
    t: 'Array', v: Concrete[],
  };

  export function ConcreteArray(v: Concrete[]): ConcreteArray {
    return { cat: 'concrete', t: 'Array', v };
  }

  type ValidArray = { cat: 'valid', t: 'Array', v: Value[] };

  export type Array = (
    ConcreteArray |
    ValidArray |
    never
  );

  export function Array(v: Value[]): Array {
    if (v.every(el => el.cat === 'concrete')) {
      return ConcreteArray(v as Concrete[]);
    }

    return ValidArray(v);
  }

  export function ValidArray(v: Value[]): ValidArray {
    return { cat: 'valid', t: 'Array', v };
  }

  export type Dimension = number | string[];

  export function Dimension(value: Array | Object): Dimension {
    if (value.t === 'Array') {
      return value.v.length;
    }

    return JsObject.keys(value.v).sort();
  }

  export namespace Dimension {
    export function equals(a: Dimension, b: Dimension) {
      if (typeof a === 'number' && typeof b === 'number') {
        return a === b;
      }

      if (JsArray.isArray(a) && JsArray.isArray(b)) {
        const len = a.length;

        if (b.length !== len) {
          return false;
        }

        for (let i = 0; i < len; i++) {
          if (a[i] !== b[i]) {
            return false;
          }
        }

        return true;
      }

      return false;
    }

    // TODO: Capitalization
    export function size(dim: Dimension): number {
      if (typeof dim === 'number') {
        return dim;
      }

      return dim.length;
    }

    export function KeyAt(dim: Dimension, i: number) {
      if (typeof dim === 'number') {
        return i;
      }

      return dim[i];
    }

    export function BuildArrayObject(
      dim: Dimension,
      values: Value[],
    ): Array | Object {
      const sz = size(dim);

      if (sz !== values.length) {
        throw new Error('Shouldn\'t be possible');
      }

      if (typeof dim === 'number') {
        return Array(values);
      }

      const keyedValues: { [key: string]: Value } = {};

      for (let i = 0; i < sz; i++) {
        keyedValues[dim[i]] = values[i];
      }

      return Object(keyedValues);
    }
  }

  // TODO: Make a specialization of the array type for matrices and return
  // that instead.
  export function MatrixDimensions(mat: Array | Object): (
    [Dimension, Dimension] |
    string
  ) {
    const outer = Dimension(mat);
    const outerSize = Dimension.size(outer);

    if (outerSize === 0) {
      return 'empty ' + mat.t;
    }

    const firstRow: Value = mat.v[Dimension.KeyAt(outer, 0)];

    if (firstRow.t !== 'Array' && firstRow.t !== 'Object') {
      return mat.t + ' with ' + firstRow.t + ' element';
    }

    const inner = Dimension(firstRow);

    for (let i = 1; i < outerSize; i++) {
      const row: Value = mat.v[Dimension.KeyAt(outer, i)];

      if (row.t !== 'Array' && row.t !== 'Object') {
        return mat.t + ' with ' + row.t + ' element';
      }

      if (!Dimension.equals(Dimension(row), inner)) {
        return mat.t + ' with inconsistent inner dimension';
      }
    }

    if (Dimension.size(inner) === 0) {
      return mat.t + ' of empty ' + firstRow.t + 's';
    }

    return [outer, inner];
  }

  export namespace Array {
    export type MethodMap = {
      Length: {
        base: Array;
        name: 'Length';
        argLength: 0;
      };

      Entries: {
        base: Array;
        name: 'Entries';
        argLength: 0;
      };

      Keys: {
        base: Array;
        name: 'Keys';
        argLength: 0;
      };

      Values: {
        base: Array;
        name: 'Values';
        argLength: 0;
      };

      String: {
        base: Array;
        name: 'String';
        argLength: 0;
      };

      First: {
        base: Array;
        name: 'First';
        argLength: 0;
      };

      Last: {
        base: Array;
        name: 'First';
        argLength: 0;
      };

      Head: {
        base: Array;
        name: 'Head';
        argLength: 0;
      };

      Tail: {
        base: Array;
        name: 'Tail';
        argLength: 0;
      };

      filter: {
        base: Array;
        name: 'filter';
        argLength: 1;
      };

      map: {
        base: Array;
        name: 'map';
        argLength: 1;
      };

      reduce: {
        base: Array;
        name: 'reduce';
        argLength: 1;
      };

      reduceFrom: {
        base: Array;
        name: 'reduceFrom';
        argLength: 2;
      };

      Row: {
        base: Array;
        name: 'Row';
        argLength: 0;
      };

      Column: {
        base: Array;
        name: 'Column';
        argLength: 0;
      };

      Transpose: {
        base: Array;
        name: 'Transpose';
        argLength: 0;
      };
    };

    export const nonEmptyMethods: string[] = [
      'First',
      'Last',
      'Head',
      'Tail',
      'reduce',
    ];

    export type Method = MethodMap[keyof MethodMap];

    export type MethodCallMap = {
      Length: {
        args: [];
        result: Number;
      };

      Entries: {
        args: [];
        result: Array;
      };

      Keys: {
        args: [];
        result: Array;
      };

      Values: {
        args: [];
        result: Array;
      };

      String: {
        args: [];
        result: String;
      };

      First: {
        args: [];
        result: Value;
      };

      Last: {
        args: [];
        result: Value;
      };

      Head: {
        args: [];
        result: Array;
      };

      Tail: {
        args: [];
        result: Array;
      };

      filter: {
        args: [Func];
        result: Array;
      };

      map: {
        args: [Func];
        result: Array;
      };

      reduce: {
        args: [Func];
        result: Array;
      };

      reduceFrom: {
        args: [Value, Func];
        result: Array;
      };

      Row: {
        args: [];
        result: Array;
      };

      Column: {
        args: [];
        result: Array;
      };

      Transpose: {
        args: [];
        result: Array | Object;
      };
    };

    export const methodImpls: {
      [name in keyof MethodMap]: MethodImpl<
        MethodMap[name],
        MethodCallMap[name]
      >;
    } = {
      Length: (base, []) => Number(base.v.length),
      Entries: (base, []) => (Array(
        // TODO: Unclear why {as any} was necessary below
        (base as any).v.map((v: Value, i: number) => Array([Number(i), v]))
      )),
      Keys: (base, []) => (Array(
        // TODO: Unclear why {as any} was necessary below
        (base as any).v.map((v: Value, i: number) => Number(i))
      )),
      Values: (base, []) => base,
      String: (base, []) => String(JsString(base)),
      First: (base, []) => base.v[0],
      Last: (base, []) => base.v[base.v.length - 1],
      Head: (base, []) => Array(base.v.slice(0, base.v.length - 1)),
      Tail: (base, []) => Array(base.v.slice(1, base.v.length)),
      filter: () => { throw new Error('Needs special implementation'); },
      map: () => { throw new Error('Needs special implementation'); },
      reduce: () => { throw new Error('Needs special implementation'); },
      reduceFrom: () => { throw new Error('Needs special implementation'); },
      Row: (base, []) => Array([base]),
      Column: (base, []) => (Array(
        // TODO: Unclear why {as any} was necessary below
        (base as any).v.map((v: Value) => Array([v]))
      )),
      Transpose: () => { throw new Error('Needs special implementation'); },
    };

    export const methodArgLengths: {
      [name in keyof MethodMap]: MethodMap[name]['argLength'];
    } = {
      Length: 0,
      Entries: 0,
      Keys: 0,
      Values: 0,
      String: 0,
      First: 0,
      Last: 0,
      Head: 0,
      Tail: 0,
      map: 1,
      filter: 1,
      reduce: 1,
      reduceFrom: 2,
      Row: 0,
      Column: 0,
      Transpose: 0,
    };
  }

  export type ConcreteObject = {
    cat: 'concrete',
    t: 'Object',
    v: { [key: string]: Concrete },
  };

  export function ConcreteObject(
    v: { [key: string]: Concrete }
  ): ConcreteObject {
    return { cat: 'concrete', t: 'Object', v };
  }

  export type ValidObject = {
    cat: 'valid',
    t: 'Object',
    v: { [key: string]: Value },
  };

  export function ValidObject(v: { [key: string]: Value }): ValidObject {
    return { cat: 'valid', t: 'Object', v };
  }

  export type Object = (
    ConcreteObject |
    ValidObject |
    never
  );

  export function Object(v: { [key: string]: Value }): Object {
    if (JsObject.keys(v).every(k => v[k].cat === 'concrete')) {
      return ConcreteObject(v as { [key: string]: Concrete });
    }

    return ValidObject(v);
  }

  export namespace Object {
    export function subscript(
      obj: Value,
      index: Value,
    ): Outcome {
      if (
        (obj.t !== 'Object' && obj.t !== 'Unknown') ||
        (index.t !== 'String' && index.t !== 'Unknown')
      ) {
        return Exception(
          null,
          ['type-error', 'object-subscript'],
          `Type error: ${obj.t}[${index.t}]`,
        );
      }

      if (obj.t === 'Unknown' || index.t === 'Unknown') {
        // TODO: maybeException?
        return Unknown.reduce(obj, index);
      }

      const maybeValue = obj.v[index.v];

      if (maybeValue === undefined) {
        return Exception(
          null,
          ['key-not-found'],
          `Object key not found: ${index.v}`,
        );
      }

      return maybeValue;
    }

    export type MethodMap = {
      Entries: {
        name: 'Entries';
        base: Object;
        argLength: 0;
      };

      Keys: {
        base: Object;
        name: 'Keys';
        argLength: 0;
      };

      Values: {
        base: Object;
        name: 'Values';
        argLength: 0;
      };

      String: {
        base: Object;
        name: 'String';
        argLength: 0;
      };

      Row: {
        base: Object;
        name: 'Row';
        argLength: 0;
      };

      Column: {
        base: Object;
        name: 'Column';
        argLength: 0;
      };

      Transpose: {
        base: Object;
        name: 'Transpose';
        argLength: 0;
      };
    };

    export type Method = MethodMap[keyof MethodMap];

    export type MethodCallMap = {
      Entries: {
        args: [];
        result: Array;
      };

      Keys: {
        args: [];
        result: Array;
      };

      Values: {
        args: [];
        result: Array;
      };

      String: {
        args: [];
        result: String;
      };

      Row: {
        args: [];
        result: Array;
      };

      Column: {
        args: [];
        result: Object;
      };

      Transpose: {
        args: [];
        result: Array | Object;
      };
    };

    // TODO: First, Last, Head, Tail, map, reduce

    export const methodImpls: {
      [name in keyof MethodMap]: MethodImpl<
        MethodMap[name],
        MethodCallMap[name]
      >;
    } = {
      Entries: (base, args) => (Array(
        JsObject.keys(base.v).sort().map(
          (k: string, i: number) => Array([String(k), base.v[k]])
        )
      )),
      Keys: (base, args) => (Array(
        JsObject.keys(base.v).sort().map(
          (k: string, i: number) => String(k)
        )
      )),
      Values: (base, args) => Array(
        JsObject.keys(base.v).sort().map(
          (k: string, i: number) => base.v[k]
        )
      ),
      String: (base, args) => String(JsString(base)),
      Row: (base, []) => Array([base]),
      Column: (base, []) => {
        const values: { [key: string]: Value } = {};

        for (const key of JsObject.keys(base.v)) {
          values[key] = Array([base.v[key]]);
        }

        return Object(values);
      },
      Transpose: () => { throw new Error('Needs special implementation'); },
    };

    export const methodArgLengths: {
      [name in keyof MethodMap]: MethodMap[name]['argLength'];
    } = {
      Entries: 0,
      Keys: 0,
      Values: 0,
      String: 0,
      Row: 0,
      Column: 0,
      Transpose: 0,
    };
  }

  export type Level = 'info' | 'warn' | 'error';

  export type Unknown = {
    cat: 'valid',
    t: 'Unknown',
    v: Level,
  };

  export function Unknown(v: Level): Unknown {
    return { cat: 'valid', t: 'Unknown', v };
  }

  export namespace Unknown {
    export function reduce(left: Value, right: Value): Unknown {
      let count = (
        (left.t === 'Unknown' ? 1 : 0) +
        (right.t === 'Unknown' ? 1 : 0)
      );

      if (count === 0) {
        throw new Error('Shouldn\'t be possible');
      }

      if (count === 1) {
        if (left.t === 'Unknown') {
          return left;
        }

        if (right.t === 'Unknown') {
          return right;
        }

        throw new Error('Shouldn\'t be possible');
      }

      if (left.v === 'error' || right.v === 'error') {
        return Unknown('error');
      }

      if (left.v === 'warn' || right.v === 'warn') {
        return Unknown('warn');
      }

      return Unknown('info');
    }
  }

  export type Exception = {
    cat: 'invalid';
    t: 'exception';
    v: Note | {
      tags: Note.Tag[],
      message: string,
    },
  };

  export function Exception(
    exp: Syntax.Element | null,
    tags: Note.Tag[],
    message: string
  ): Exception {
    tags = ['exception', 'exception-source', ...tags];
    message = 'Exception: ' + message;

    if (exp !== null) {
      return { cat: 'invalid', t: 'exception', v: Note(
        exp.p,
        'error',
        tags,
        message,
      ) };
    }

    tags = ['error', ...tags];

    return { cat: 'invalid', t: 'exception', v: { tags, message } };
  }

  export namespace Exception {
    function sameLine(a: Note.Pos, b: Note.Pos) {
      const [aFile, aRng] = a;
      const [bFile, bRng] = b;

      if (aFile !== bFile) {
        return false;
      }

      if (aRng === null || bRng === null) {
        return aRng === bRng;
      }

      return aRng[0][0] === bRng[0][0];
    }

    export function unwind(e: Exception, exp: Syntax.Element) {
      if (!('level' in e.v)) {
        return JsObject.assign({}, e, {
          v: JsObject.assign({}, e.v, {
            pos: exp.p,
            level: 'error',
            subnotes: [],
          }),
        });
      }

      // Don't add multiple notes on the same line
      for (const n of Note.flatten([e.v])) {
        if (sameLine(n.pos, exp.p)) {
          return e;
        }
      }

      return JsObject.assign({}, e, {
        v: JsObject.assign({}, e.v, {
          subnotes: [...e.v.subnotes, JsObject.assign({}, e.v, {
            pos: exp.p,
            message: 'Trace (' + e.v.subnotes.length + '): ' + e.v.message,
            tags: [
              ...e.v.tags.filter(t => t !== 'exception-source'),
              'exception-trace',
            ],
            subnotes: [],
          })]
        }),
      });
    }
  }

  export type Control = {
    cat: 'invalid',
    t: 'control',
    v: 'break' | 'continue',
  };

  export function Control(v: 'break' | 'continue'): Control {
    return { cat: 'invalid', t: 'control', v };
  }

  export type Concrete = (
    String |
    Number |
    Bool |
    Null |
    Func |
    ConcreteArray |
    ConcreteObject |
    never
  );

  export type ConcreteAtom = (
    String |
    Number |
    Bool |
    Null |
    Func | // TODO: Are functions atoms?
    never
  );

  export type Value = (
    Concrete |
    Array |
    Object |
    Unknown |
    never
  );

  export type ValueAtom = (
    ConcreteAtom |
    Unknown |
    never
  );

  type MethodBase = {
    name: {};
    base: {};
    argLength: {};
  };

  type MethodCallBase = {
    args: {};
    result: {};
  };

  type MethodImpl<M extends MethodBase, MC extends MethodCallBase> = (
    base: M['base'],
    args: MC['args'],
  ) => MC['result'];

  export type Func = {
    cat: 'concrete';
    t: 'Func';
    v: {
      def: (
        {
          t: 'plain';
          v: {
            exp: Syntax.FunctionExpression;
            az: Analyzer;
          };
        } |
        {
          t: 'method';
          v: MethodTypeMap[keyof MethodTypeMap];
        } |
        {
          t: 'op';
          v: Syntax.VanillaOperator;
        } |
        never
      );
      binds: Value[];
    };
  };

  export type MethodTypeMap = {
    Null: Null.Method;
    Bool: Bool.Method;
    Number: Number.Method;
    String: String.Method;
    Array: Array.Method;
    Object: Object.Method;
  };

  export const methodImpls = {
    Null: Null.methodImpls,
    Bool: Bool.methodImpls,
    Number: Number.methodImpls,
    String: String.methodImpls,
    Array: Array.methodImpls,
    Object: Object.methodImpls,
  };

  export const methodArgLengths = {
    Null: Null.methodArgLengths,
    Bool: Bool.methodArgLengths,
    Number: Number.methodArgLengths,
    String: String.methodArgLengths,
    Array: Array.methodArgLengths,
    Object: Object.methodArgLengths,
  };

  export type FuncMethod = Func & { v: { def: { t: 'method' } } };
  export type FuncOp = Func & { v: { def: { t: 'op' } } };

  export function FuncOp(v: Syntax.VanillaOperator) {
    return Func({ t: 'op', v });
  }

  export function lookupMethod(base: Value, name: string): FuncMethod | null {
    if (
      !(base.t in methodImpls) ||
      !(name in methodImpls[base.t])
    ) {
      return null;
    }

    return {
      cat: 'concrete',
      t: 'Func',
      v: {
        def: {
          t: 'method',
          v: {
            t: base.t,
            base,
            name,
            argLength: methodArgLengths[base.t][name],
          } as any,
          // Not sure if there's a way to avoid {any} above. Trying to push
          // typescript's type system very far already here.
        },
        binds: [] as Value[],
      },
    };
  }

  export type FuncPlain = Func & { v: { def: { t: 'plain' } } };

  export function Func(def: Func['v']['def']): Func {
    return { cat: 'concrete', t: 'Func', v: { def, binds: [] } };
  }

  export function FuncPlain(v: {
    exp: Syntax.FunctionExpression,
    az: Analyzer
  }): FuncPlain {
    return { cat: 'concrete', t: 'Func', v: { def: { t: 'plain', v }, binds: [] } };
  }

  export namespace Func {
    export function ArgLength(f: Func): number {
      return DefArgLength(f.v.def) - f.v.binds.length;
    }

    function DefArgLength(def: Func['v']['def']): number {
      switch (def.t) {
        case 'plain': {
          return def.v.exp.v.args.length;
        }

        case 'method': {
          return def.v.argLength;
        }

        case 'op': {
          return 2;
        }
      }
    }
  }

  export function ObjectKeyString(key: string) {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return key;
    }

    return '\'' + String.escape(key) + '\'';
  }

  export function JsString(v: Outcome): string {
    switch (v.t) {
      case 'String': return '\'' + String.escape(v.v) + '\'';
      case 'Number': return v.v.toString();
      case 'Bool': return v.v.toString();
      case 'Null': return 'null';

      case 'Func': {
        const funcv = v.v;

        return (() => {
          switch (funcv.def.t) {
            case 'plain': {
              // TODO: include argument names
              return (
                `<func ${
                  funcv.def.v.exp.v.name ?
                  funcv.def.v.exp.v.name.v :
                  '(anonymous)'
                }>`
              );
            }

            case 'method': {
              return `<method ${funcv.def.v.base.t}:${funcv.def.v.name}>`;
            }

            case 'op': {
              return `<operator ${funcv.def.v}>`;
            }
          }
        })();
      }

      case 'Array': {
        switch (v.cat) {
          // These are the same but need to be separated out due to a curious
          // typescript edge case
          case 'concrete': return `[${v.v.map(JsString).join(',')}]`;
          case 'valid': return `[${v.v.map(JsString).join(',')}]`;
        }
      }

      case 'Object': return `{${
        JsObject.keys(v.v).sort().map(key => (
          // TODO: In future keys can be non-identifiers and will need to be
          // quoted
          `${ObjectKeyString(key)}:${JsString(v.v[key])}`
        )).join(',')
      }}`;

      case 'Unknown': return `<unknown ${v.v}>`;

      case 'exception': return (
        v.v === null ?
        '<exception>' :
        `<exception: ${v.v.message}>`
      );
    }
  }

  export function LongString(v: Outcome): string {
    switch (v.t) {
      case 'String':
      case 'Number':
      case 'Bool':
      case 'Null':
      case 'Func':
      case 'Unknown':
      case 'exception':
        return JsString(v);

      case 'Array': {
        // TODO: Unclear why {as any} was necessary below (related to
        // unnecessary switch further down?)
        const isAtomic = (v.v as any).every(
          (el: Value) => el.t !== 'Array' && el.t !== 'Object'
        );

        if (isAtomic) {
          switch (v.cat) {
            // These are the same but need to be separated out due to a curious
            // typescript edge case
            case 'concrete': return `[${v.v.map(JsString).join(', ')}]`;
            case 'valid': return `[${v.v.map(JsString).join(', ')}]`;
          }
        }

        switch (v.cat) {
          // These are the same but need to be separated out due to a curious
          // typescript edge case
          case 'concrete': return `[\n  ${v.v
            .map(el => LongString(el).replace(/\n/g, '\n  '))
            .join(',\n  ')
          },\n]`;

          case 'valid': return `[\n  ${v.v
            .map(el => LongString(el).replace(/\n/g, '\n  '))
            .join(',\n  ')
          },\n]`;
        }
      }

      case 'Object': {
        // TODO: Unclear why {as any} was necessary below (related to
        // unnecessary switch further down?)
        const isAtomic = JsObject.keys(v.v).every(
          key => v.v[key].t !== 'Array' && v.v[key].t !== 'Object'
        );

        if (isAtomic) {
          return '{' + JsObject.keys(v.v).sort().map(key => (
            `${ObjectKeyString(key)}: ${JsString(v.v[key])}`
          )).join(', ') + '}';
        }

        return `{\n  ${JsObject.keys(v.v).sort()
          .map(key => (
            ObjectKeyString(key) + ': ' +
            LongString(v.v[key]).replace(/\n/g, '\n  ')
          ))
          .join(',\n  ')
        },\n}`;
      }
    }
  }

  export function Maybe(): Outcome | null { return null; }

  export function SameType(
    left: Concrete,
    right: Concrete
  ): boolean {
    switch (left.t) {
      case 'Func': {
        if (right.t !== 'Func') {
          return false;
        }

        // TODO: Types of arguments?
        return (
          left.v.def.t === right.v.def.t &&
          Func.ArgLength(left) === Func.ArgLength(right)
        );
      }

      case 'Array': {
        if (right.t !== 'Array') {
          return false;
        }

        const len = left.v.length;

        if (right.v.length !== len) {
          return false;
        }

        for (let i = 0; i < len; i++) {
          const subSameType = SameType(left.v[i], right.v[i]);

          if (!subSameType) {
            return false;
          }
        }

        return true;
      }

      case 'Object': {
        if (right.t !== 'Object') {
          return false;
        }

        let leftKeys = JsObject.keys(left.v);
        let rightKeys = JsObject.keys(right.v);

        const len = leftKeys.length;

        if (rightKeys.length !== len) {
          return false;
        }

        leftKeys = leftKeys.sort();
        rightKeys = rightKeys.sort();

        for (let i = 0; i < len; i++) {
          const subSameType = SameType(
            left.v[leftKeys[i]],
            right.v[rightKeys[i]],
          )

          if (!subSameType) {
            return false;
          }

          return true;
        }

        return true;
      }

      case 'String':
      case 'Number':
      case 'Bool':
      case 'Null': {
        return left.t === right.t;
      }
    }
  }

  function UncheckedTypedEqual(
    left: Concrete,
    right: Concrete,
  ): Bool {
    switch (left.t) {
      case 'String':
      case 'Number':
      case 'Bool':
      case 'Null': {
        return Bool(left.v === right.v);
      }

      case 'Func': {
        // Not defining a way to compare functions right now. In general, it's
        // impossible to tell whether functions behave the same way, so there
        // will have to be null sometimes.
        // In general, perhaps the syntax trees of the optimised functions can
        // be compared, true if the same, but still null rather than false if
        // different.
        // (Revisiting this, comparing functions should probably usually throw.
        throw new Error('Shouldn\'t be possible, but may be later');
        // return null;
      }

      case 'Array': {
        if (right.t !== 'Array') {
          throw new Error('Shouldn\'t be possible');
        }

        for (let i = 0; i < left.v.length; i++) {
          const subEq = UncheckedTypedEqual(left.v[i], right.v[i]);

          if (!subEq.v) {
            return Bool(false);
          }
        }

        return Bool(true);
      }

      case 'Object': {
        if (right.t !== 'Object') {
          throw new Error('Shouldn\'t be possible');
        }

        // Already checked types are equal so we know that the left keys are also
        // the right keys.
        const keys = JsObject.keys(left.v).sort();

        for (const key of keys) {
          const subEq = UncheckedTypedEqual(left.v[key], right.v[key]);

          if (!subEq.v) {
            return Bool(false);
          }
        }

        return Bool(true);
      }
    }
  }

  export function TypedEqual(
    left: Concrete,
    right: Concrete,
  ): Bool | Exception {
    if (!SameType(left, right)) {
      return Exception(
        null,
        ['type-error', 'comparison'],
        // TODO: Show deep type information, reconsider '=='
        `Type error: ${left.t} == ${right.t}`,
      );
    }

    return UncheckedTypedEqual(left, right);
  }

  function UncheckedTypedLessThan(
    left: Concrete,
    right: Concrete,
  ): Bool {
    switch (left.t) {
      case 'String':
      case 'Number':
      case 'Bool':
      case 'Null': {
        // Need to use any here because typescript thinks null comparison is bad
        // but we're ok with it and it does the right thing.
        return Bool((left.v as any) < (right.v as any));
      }

      case 'Func': {
        // Not defining a way to compare functions right now.
        throw new Error('Shouldn\'t be possible');
      }

      case 'Array': {
        if (right.t !== 'Array') {
          throw new Error('Shouldn\'t be possible');
        }

        for (let i = 0; i < left.v.length; i++) {
          const subLT = UncheckedTypedLessThan(left.v[i], right.v[i]);

          if (subLT.v) {
            return Bool(true);
          }

          const subGT = UncheckedTypedLessThan(right.v[i], left.v[i]);

          if (subGT.v) {
            return Bool(false);
          }
        }

        return Bool(false);
      }

      case 'Object': {
        if (right.t !== 'Object') {
          throw new Error('Shouldn\'t be possible');
        }

        // Already checked types are equal so we know that the left keys are also
        // the right keys.
        const keys = JsObject.keys(left.v).sort();

        // TODO: Deduplicate with arrays
        for (const key of keys) {
          const subLT = UncheckedTypedLessThan(left.v[key], right.v[key]);

          if (subLT.v) {
            return Bool(true);
          }

          const subGT = UncheckedTypedLessThan(right.v[key], left.v[key]);

          if (subGT.v) {
            return Bool(false);
          }
        }

        return Bool(false);
      }
    }
  }

  export function TypedLessThan(
    exp: Syntax.Expression | null,
    left: Concrete,
    right: Concrete,
  ): Bool | Exception {
    const sameType = SameType(left, right);

    if (sameType === false) {
      return Exception(
        null,
        ['type-error', 'comparison'],
        // TODO: Surfacing this is confusing because eg '>' gets swapped to '<'
        // and this inverts left and right (compared to user's code)
        `Type error: ${JsString(left)} < ${JsString(right)}`,
      );
    }

    return UncheckedTypedLessThan(left, right);
  }

  function InvertIfBool<Out extends Outcome>(out: Out): Out {
    if (out.t !== 'Bool') {
      return out;
    }

    // as Out because typescript incompleteness
    return { cat: 'concrete', t: 'Bool', v: !out.v } as Out;
  }

  type ComparisonOp = '==' | '!=' | '<' | '>' | '<=' | '>=';

  export function TypedComparison(
    exp: Syntax.Expression | null,
    op: ComparisonOp,
    left: Concrete,
    right: Concrete,
  ): Bool | Exception {
    switch (op) {
      case '==': return TypedEqual(left, right);
      case '!=': return InvertIfBool(TypedEqual(left, right));
      case '<': return TypedLessThan(exp, left, right);
      case '>': return TypedLessThan(exp, right, left);
      case '<=': return InvertIfBool(TypedLessThan(exp, right, left));
      case '>=': return InvertIfBool(TypedLessThan(exp, left, right));
    }
  }

  export function EvalVanillaOperator(
    // TODO: exp Shouldn't be necessary (should add positions as stack unwinds)
    exp: Syntax.Expression | null,

    op: Syntax.VanillaOperator,
    [left, right]: [Outcome.Value, Outcome.Value],
  ): Outcome.Value | Outcome.Exception {
    let value: Outcome | null = (() => {
      switch (op) {
        case '-':
        case '+': {
          const impl: (a: number, b: number) => number = (() => {
            switch (op) {
              case '-': return (a: number, b: number) => a - b;
              case '+': return (a: number, b: number) => a + b;
            }
          })();

          function addAtoms(
            // TODO: Fix shadowing
            left: ValueAtom,
            right: ValueAtom
          ): ValueAtom | null {
            if (left.t === 'Number' && right.t === 'Number') {
              return Number(impl(left.v, right.v));
            }

            if (
              (left.t === 'Unknown' || left.t === 'Number') &&
              (right.t === 'Unknown' || right.t === 'Number')
            ) {
              return Unknown.reduce(left, right);
            }

            return null;
          }

          function addValues(
            // TODO: Fix shadowing
            left: Value,
            right: Value,
          ): Value | null {
            if (
              left.t === 'Array' ||
              left.t === 'Object' ||
              right.t === 'Array' ||
              right.t === 'Object'
            ) {
              if (left.t === 'Array') {
                if (right.t !== 'Array') {
                  return null;
                }

                const len = left.v.length;

                if (right.v.length !== len) {
                  return null;
                }

                const values: Value[] = [];

                for (let i = 0; i < len; i++) {
                  const sum = addValues(left.v[i], right.v[i]);

                  if (sum === null) {
                    return null;
                  }

                  values.push(sum);
                }

                return Array(values);
              }

              if (left.t === 'Object') {
                if (right.t !== 'Object') {
                  return null;
                }

                let leftKeys = JsObject.keys(left.v);
                let rightKeys = JsObject.keys(right.v);

                const len = leftKeys.length;

                if (leftKeys.length !== rightKeys.length) {
                  return null;
                }

                leftKeys = leftKeys.sort();
                rightKeys = rightKeys.sort();

                const values: { [key: string]: Value } = {};

                for (let i = 0; i < len; i++) {
                  const key = leftKeys[i];

                  if (rightKeys[i] !== key) {
                    return null;
                  }

                  const sum = addValues(left.v[key], right.v[key]);

                  if (sum === null) {
                    return null;
                  }

                  values[key] = sum;
                }

                return Object(values);
              }

              return null;
            }

            return addAtoms(left, right);
          }

          return addValues(left, right);
        }

        case '++': {
          if (left.t === 'String' && right.t === 'String') {
            return String(left.v + right.v);
          }

          if (left.t === 'Array' && right.t === 'Array') {
            if (left.cat === 'concrete' && right.cat === 'concrete') {
              return ConcreteArray([...left.v, ...right.v]);
            }

            return Array([...left.v, ...right.v]);
          }

          if (left.t === 'Object' && right.t === 'Object') {
            const leftKeys: { [key: string]: true | undefined } = {};

            for (const key of JsObject.keys(left.v)) {
              leftKeys[key] = true;
            }

            for (const key of JsObject.keys(right.v)) {
              if (leftKeys[key]) {
                return Exception(
                  null,
                  [
                    'duplicate',
                    'duplicate-key',
                    'object-addition',
                  ],
                  (
                    'Type error: objects cannot be added due to duplicate ' +
                    'key ' + key
                  ),
                );
              }
            }

            if (left.cat === 'concrete' && right.cat === 'concrete') {
              return ConcreteObject(JsObject.assign({}, left.v, right.v));
            }

            return Object(JsObject.assign({}, left.v, right.v));
          }

          const forbiddenTypes: Value['t'][] = [
            'Number',
            'Bool',
            'Null',
            'Func', // TODO: define function concatenation when appropriate
          ];

          if (
            forbiddenTypes.indexOf(left.t) !== -1 ||
            forbiddenTypes.indexOf(right.t) !== -1
          ) {
            return null;
          }

          if (left.t === 'Unknown' || right.t === 'Unknown') {
            return Unknown.reduce(left, right);
          }

          return null;
        }

        case '/':
        case '*': {
          const impl: (a: number, b: number) => number = (() => {
            switch (op) {
              case '/': return (a: number, b: number) => a / b;
              case '*': return (a: number, b: number) => a * b;
            }
          })();

          function multiplyValues(
            // TODO: Fix shadowing
            left: Value,
            right: Value,
          ): Value | null {
            if (left.t === 'Number' && right.t === 'Number') {
              return Number(impl(left.v, right.v));
            }

            if (
              (left.t === 'Array' || left.t === 'Object') &&
              (right.t === 'Array' || right.t === 'Object')
            ) {
              const leftDims = MatrixDimensions(left);

              if (typeof leftDims === 'string') {
                return null;
              }

              const rightDims = MatrixDimensions(right);

              if (typeof rightDims === 'string') {
                return null;
              }

              const [leftRows, leftCols] = leftDims;
              const [rightRows, rightCols] = rightDims;

              if (!Dimension.equals(leftCols, rightRows)) {
                // TODO: Surface better error
                return null;
              }

              const outerSize = Dimension.size(leftRows);
              const middleSize = Dimension.size(leftCols);
              const innerSize = Dimension.size(rightCols);

              const rows: Value[] = [];

              for (let i = 0; i < outerSize; i++) {
                const row: Value[] = [];
                const iKey = Dimension.KeyAt(leftRows, i);

                for (let j = 0; j < innerSize; j++) {
                  const jKey = Dimension.KeyAt(rightCols, j);
                  const firstKKey = Dimension.KeyAt(leftCols, 0);

                  // Know that right.v is non-empty because it wouldn't have
                  // passed the matrix test otherwise, therefore also know that
                  // left.v[i].v is non-empty since it has the same length.
                  let sum: Outcome | null = multiplyValues(
                    (left as any).v[iKey].v[firstKKey],
                    (right as any).v[firstKKey].v[jKey],
                  );

                  if (sum === null) {
                    return null;
                  }

                  for (let k = 1; k < middleSize; k++) {
                    const kKey = Dimension.KeyAt(leftCols, k);

                    const product = multiplyValues(
                      (left as any).v[iKey].v[kKey],
                      (right as any).v[kKey].v[jKey]
                    );

                    if (product === null) {
                      return null;
                    }

                    sum = EvalVanillaOperator(exp, '+', [sum, product]);

                    if (sum.t === 'exception') {
                      // TODO: Return the exception
                      return null;
                    }
                  }

                  row.push(sum);
                }

                rows.push(Dimension.BuildArrayObject(rightCols, row));
              }

              return Dimension.BuildArrayObject(leftRows, rows);
            }

            const maybeNum = (
              (
                op === '*' && // Cannot divide with number on left
                (left.t === 'Number' || left.t === 'Unknown')
              ) ? left :
              right.t === 'Number' || right.t === 'Unknown' ? right :
              null
            );

            if (maybeNum === null) {
              return null;
            }

            const arr = (
              left.t === 'Array' ? left :
              right.t === 'Array' ? right :
              null
            );

            if (arr !== null) {
              const values: Value[] = [];

              for (const v of arr.v) {
                const mul = multiplyValues(v, maybeNum);

                if (mul === null) {
                  return null;
                }

                values.push(mul);
              }

              return Array(values);
            }

            const obj = (
              left.t === 'Object' ? left :
              right.t === 'Object' ? right :
              null
            );

            if (obj !== null) {
              const values: { [key: string]: Value } = {};

              for (const key of JsObject.keys(obj.v)) {
                const mul = multiplyValues(obj.v[key], maybeNum);

                if (mul === null) {
                  return null;
                }

                values[key] = mul;
              }

              return Object(values);
            }

            return null;
          }

          return multiplyValues(left, right);
        }

        // Number only operators (for now)
        case '<<':
        case '>>':
        case '&':
        case '^':
        case '|':
        case '%':
        case '**': {
          const impl: (a: number, b: number) => number = (() => {
            switch (op) {
              case '<<': return (a: number, b: number) => a << b;
              case '>>': return (a: number, b: number) => a >> b;
              case '&': return (a: number, b: number) => a & b;
              case '^': return (a: number, b: number) => a ^ b;
              case '|': return (a: number, b: number) => a | b;
              case '%': return (a: number, b: number) => a % b;
              case '**': return (a: number, b: number) => a ** b;
            }
          })();

          if (left.t === 'Number' && right.t === 'Number') {
            return Number(impl(left.v, right.v));
          }

          if (
            (left.t === 'Unknown' || right.t === 'Unknown') &&
            (left.t === 'Number' || right.t === 'Number')
          ) {
            return Unknown.reduce(left, right);
          }

          return null;
        }

        case '&&':
        case '||': {
          const impl: (a: boolean, b: boolean) => boolean = (() => {
            switch (op) {
              case '&&': return (a: boolean, b: boolean) => a && b;
              case '||': return (a: boolean, b: boolean) => a || b;
            }
          })();

          if (left.t === 'Bool' && right.t === 'Bool') {
            return Bool(impl(left.v, right.v));
          }

          if (
            (left.t === 'Unknown' || right.t === 'Unknown') &&
            (left.t === 'Bool' || right.t === 'Bool')
          ) {
            return Unknown.reduce(left, right);
          }

          return null;
        }

        case '==':
        case '!=':
        case '<':
        case '>':
        case '<=':
        case '>=': {
          if (left.t === 'Unknown' || right.t === 'Unknown') {
            return Unknown.reduce(left, right);
          }

          if (left.cat === 'valid' || right.cat === 'valid') {
            // (This case is for objects & arrays that have unknowns)
            // TODO: Should be possible to sometimes (often?) determine
            // ordering without concrete array/object.
            return Unknown('error'); // TODO: level should be based on contents
          }

          return TypedComparison(exp, op, left, right)
        }
      }
    })();

    if (value === null) {
      value = Exception(
        null,
        ['type-error', 'operator'],
        `Type error: ${left.t} ${op} ${right.t}`,
      );
    }

    return value;
  }
}

export default Outcome;
