import Analyzer from '.';
import Note from '../Note';
import Syntax from '../parser/Syntax';

// TODO: Types start with capitals
// (primitive types can be lowercase?)

type Outcome = Outcome.Value | Outcome.Exception;
const JsObject = Object;

namespace Outcome {
  export type String = { cat: 'concrete', t: 'string', v: string };

  export function String(v: string): String {
    return { cat: 'concrete', t: 'string', v };
  }

  export namespace String {
    export function multiply(
      s: String,
      n: Number
    ): String {
      // TODO: Check n is an appropriate number (wait for integer
      // implementation?)
      return String(s.v.repeat(n.v));
    }
  }

  export type Number = { cat: 'concrete', t: 'number', v: number };

  export function Number(v: number): Number {
    return { cat: 'concrete', t: 'number', v };
  }

  export type Bool = { cat: 'concrete', t: 'bool', v: boolean };

  export function Bool(v: boolean): Bool {
    return { cat: 'concrete', t: 'bool', v };
  }

  export type Null = { cat: 'concrete', t: 'null', v: null };

  export function Null(): Null {
    return { cat: 'concrete', t: 'null', v: null };
  }

  export type Func = {
    cat: 'concrete';
    t: 'func';
    v: (
      {
        t: 'plain';
        v: {
          exp: Syntax.FunctionExpression;
          az: Analyzer;
        };
      } |
      {
        t: 'method';
        v: Array.Method;
      } |
      never
    );
  };

  export type FuncPlain = Func & { v: { t: 'plain' } };

  export function Func(v: Func['v']): Func {
    return { cat: 'concrete', t: 'func', v };
  }

  export function FuncPlain(v: {
    exp: Syntax.FunctionExpression,
    az: Analyzer
  }) {
    return Func({ t: 'plain', v });
  }

  export namespace Func {
    export function ArgLength(f: Func): number {
      switch (f.v.t) {
        case 'plain': {
          return f.v.v.exp.v.args.length;
        }

        case 'method': {
          return (() => {
            switch (f.v.v.t) {
              case 'array': {
                return Array.methods[f.v.v.name].length;
              }
            }
          })();
        }
      }
    }
  }

  export type ConcreteArray = {
    cat: 'concrete',
    t: 'array', v: Concrete[],
  };

  export function ConcreteArray(v: Concrete[]): ConcreteArray {
    return { cat: 'concrete', t: 'array', v };
  }

  type ValidArray = { cat: 'valid', t: 'array', v: Value[] };

  export type Array = (
    ConcreteArray |
    ValidArray |
    never
  );

  export function Array(v: Value[]): ValidArray {
    return { cat: 'valid', t: 'array', v };
  }

  export namespace Array {
    export function multiply(a: Array, n: Number): Array {
      // TODO: Check n is an appropriate number (wait for integer
      // implementation?)

      switch (a.cat) {
        case 'concrete': {
          const res = ConcreteArray([]);

          for (let i = 0; i < n.v; i++) {
            res.v.push(...a.v);
          }

          return res;
        }

        case 'valid': {
          const res = Array([]);

          for (let i = 0; i < n.v; i++) {
            res.v.push(...a.v);
          }

          return res;
        }
      }
    }

    export type Method = (
      {
        t: 'array';
        base: Array;
        name: 'length';
      } |
      never
    );

    export const methods = {
      length: (a: Array) => Number(a.v.length),
    };
  }

  export type ConcreteObject = {
    cat: 'concrete',
    t: 'object',
    v: { [key: string]: Concrete },
  };

  export function ConcreteObject(
    v: { [key: string]: Concrete }
  ): ConcreteObject {
    return { cat: 'concrete', t: 'object', v };
  }

  export type Object = (
    ConcreteObject |
    {
      cat: 'valid',
      t: 'object',
      v: { [key: string]: Value },
    } |
    never
  );

  export function Object(v: { [key: string]: Value }): Object {
    return { cat: 'valid', t: 'object', v };
  }

  export namespace Object {
    export function multiply(
      exp: Syntax.Expression,
      obj: Object,
      n: Number
    ): Object | Exception {
      if (n.v === 0) {
        return ConcreteObject({});
      }

      if (n.v === 1) {
        return obj;
      }

      if (JsObject.keys(obj.v).length === 0) {
        return obj;
      }

      return Exception(exp,
        ['object-multiplication'],
        `Attempt to multiply non-empty object by ${n.v} (can only multiply ` +
        'non-empty objects by 0 or 1)',
      );
    }

    export function subscript(
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
        return Unknown();
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
  }

  export type Unknown = { cat: 'valid', t: 'unknown', v: null };

  export function Unknown(): Unknown {
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

  export function Exception(
    origin: Syntax.Element,
    tags: Note.Tag[],
    message: string
  ): Exception {
    return { cat: 'invalid', t: 'exception', v: { origin, tags, message } };
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

  export type Value = (
    Concrete |
    Array |
    Object |
    Unknown |
    never
  );

  export function JsString(v: Outcome): string {
    switch (v.t) {
      case 'string': return JSON.stringify(v.v);
      case 'number': return v.v.toString();
      case 'bool': return v.v.toString();
      case 'null': return 'null';

      case 'func': {
        const funcv = v.v;

        return (() => {
          switch (funcv.t) {
            case 'plain': {
              // TODO: include argument names
              return (
                `<func ${
                  funcv.v.exp.v.name ?
                  funcv.v.exp.v.name.v :
                  '(anonymous)'
                }>`
              );
            }

            case 'method': {
              return `<method ${funcv.v.t}:${funcv.v.name}>`;
            }
          }
        })();
      }

      case 'array': {
        switch (v.cat) {
          // These are the same but need to be separated out due to a curious
          // typescript edge case
          case 'concrete': return `[${v.v.map(JsString).join(', ')}]`;
          case 'valid': return `[${v.v.map(JsString).join(', ')}]`;
        }
      }

      case 'object': return `{${
        JsObject.keys(v.v).sort().map(key => (
          // TODO: In future keys can be non-identifiers and will need to be
          // quoted
          `${key}: ${JsString(v.v[key])}`
        )).join(', ')
      }}`;

      case 'unknown': return '<unknown>';
      case 'exception': return `<exception: ${v.v.message}>`;
    }
  }

  export function Maybe(): Outcome | null { return null; }

  export function SameType(
    left: Concrete,
    right: Concrete
  ): Bool {
    switch (left.t) {
      case 'func': {
        if (right.t !== 'func') {
          return Bool(false);
        }

        // TODO: Types of arguments?
        return Bool(
          left.v.t === right.v.t &&
          Func.ArgLength(left) === Func.ArgLength(right)
        );
      }

      case 'array': {
        if (right.t !== 'array' || right.v.length !== left.v.length) {
          return Bool(false);
        }

        for (let i = 0; i < left.v.length; i++) {
          const subSameType = SameType(left.v[i], right.v[i]);

          if (!subSameType) {
            return Bool(false);
          }
        }

        return Bool(true);
      }

      case 'object': {
        if (right.t !== 'object') {
          return Bool(false);
        }

        const leftKeys = JsObject.keys(left.v).sort();
        const rightKeys = JsObject.keys(right.v).sort();

        if (leftKeys.length !== rightKeys.length) {
          return Bool(false);
        }

        for (let i = 0; i < leftKeys.length; i++) {
          const subSameType = SameType(
            left.v[leftKeys[i]],
            right.v[rightKeys[i]],
          )

          if (!subSameType) {
            return Bool(false);
          }

          return Bool(true);
        }

        return Bool(true);
      }

      case 'string':
      case 'number':
      case 'bool':
      case 'null': {
        return Bool(left.t === right.t);
      }
    }
  }

  export function TypedEqual(
    exp: Syntax.Expression,
    left: Concrete,
    right: Concrete,
  ): Bool | Exception {
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
        return Bool(left.v === right.v);
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
            return Bool(false);
          }
        }

        return Bool(true);
      }

      case 'object': {
        if (right.t !== 'object') {
          throw new Error('Shouldn\'t be possible');
        }

        // Already checked types are equal so we know that the left keys are also
        // the right keys.
        const keys = JsObject.keys(left.v).sort();

        for (const key of keys) {
          const subEq = TypedEqual(exp, left.v[key], right.v[key]);

          if (subEq.t === 'exception') {
            return subEq;
          }

          if (!subEq.v) {
            return Bool(false);
          }
        }

        return Bool(true);
      }
    }
  }

  export function TypedLessThan(
    exp: Syntax.Expression,
    left: Concrete,
    right: Concrete,
  ): Bool | Exception {
    const sameType = SameType(left, right);

    if (sameType.v === false) {
      return Exception(exp,
        ['type-error', 'comparison'],
        // TODO: Surfacing this is confusing because eg '>' gets swapped to '<'
        // and this inverts left and right (compared to user's code)
        `Type error: ${JsString(left)} < ${JsString(right)}`,
      );
    }

    switch (left.t) {
      case 'string':
      case 'number':
      case 'bool':
      case 'null': {
        // Need to use any here because typescript thinks null comparison is bad
        // but we're ok with it and it does the right thing.
        return Bool((left.v as any) < (right.v as any));
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
            return Bool(true);
          }

          const subGT = TypedLessThan(exp, right.v[i], left.v[i]);

          if (subGT.t === 'exception') {
            return subGT;
          }

          if (subGT.v) {
            return Bool(false);
          }
        }

        return Bool(false);
      }

      case 'object': {
        if (right.t !== 'object') {
          throw new Error('Shouldn\'t be possible');
        }

        // Already checked types are equal so we know that the left keys are also
        // the right keys.
        const keys = JsObject.keys(left.v).sort();

        // TODO: Deduplicate with arrays
        for (const key of keys) {
          const subLT = TypedLessThan(exp, left.v[key], right.v[key]);

          if (subLT.t === 'exception') {
            return subLT;
          }

          if (subLT.v) {
            return Bool(true);
          }

          const subGT = TypedLessThan(exp, right.v[key], left.v[key]);

          if (subGT.t === 'exception') {
            return subGT;
          }

          if (subGT.v) {
            return Bool(false);
          }
        }

        return Bool(false);
      }
    }
  }

  function InvertIfBool<Out extends Outcome>(out: Out): Out {
    if (out.t !== 'bool') {
      return out;
    }

    // as Out because typescript incompleteness
    return { t: 'bool', v: !out.v } as Out;
  }

  type ComparisonOp = '==' | '!=' | '<' | '>' | '<=' | '>=';

  export function TypedComparison(
    exp: Syntax.Expression,
    op: ComparisonOp,
    left: Concrete,
    right: Concrete,
  ): Bool | Exception {
    switch (op) {
      case '==': return TypedEqual(exp, left, right);
      case '!=': return InvertIfBool(TypedEqual(exp, left, right));
      case '<': return TypedLessThan(exp, left, right);
      case '>': return TypedLessThan(exp, right, left);
      case '<=': return InvertIfBool(TypedLessThan(exp, right, left));
      case '>=': return InvertIfBool(TypedLessThan(exp, left, right));
    }
  }
}

export default Outcome;
