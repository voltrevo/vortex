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
    v: {
      exp: Syntax.FunctionExpression;
      az: Analyzer;
    };
  };

  export function Func(v: {
    exp: Syntax.FunctionExpression;
    az: Analyzer;
  }): Func {
    return { cat: 'concrete', t: 'func', v };
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

      // TODO: include argument names
      case 'func': return (
        `<func ${v.v.exp.v.name ? v.v.exp.v.name.v : '(anonymous)'}>`
      );

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
}

export default Outcome;
