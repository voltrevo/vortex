declare function require(name: string): any;

const { parser: parserUntyped } = require('./vasm.js');

namespace Syntax {
  export type CPos = [number, number];
  export type Pos = [string, [CPos, CPos]];

  export type Identifier = { t: 'identifier', v: string, p: Pos };

  export type Value = (
    Null |
    Bool |
    Number_ |
    String_ |
    Array_ |
    Object_ |
    never
  );

  export type Null = { t: 'null', v: null, p: Pos };
  export type Bool = { t: 'bool', v: boolean, p: Pos };
  export type Number_ = { t: 'number', v: string, p: Pos };
  export type String_ = { t: 'string', v: string, p: Pos };

  export type Array_ = { t: 'array', v: Value[], p: Pos };
  export type Object_ = { t: 'object', v: [Value, Value][], p: Pos };

  export type Func = { t: 'func', v: Block, p: Pos };

  export type GFunc = {
    t: 'gfunc',
    v: { nlabel: string, block: Block },
    p: Pos,
  };

  export type Word = { t: 'word', v: string, p: Pos };

  export type LabelledWord = (
    { t: 'get', v: string, p: Pos } |
    { t: 'set', v: string, p: Pos } |
    { t: 'gcall', v: string, p: Pos } |
    { t: 'hoist', v: string, p: Pos } |
    never
  );

  export type Statement = (
    LabelledWord |
    Word |
    Value |
    Func |
    GFunc |
    If |
    Loop |
    never
  );

  export type Block = { t: 'block', v: Statement[], p: Pos };
  export type Program = Block;

  export type If = {
    t: 'if',
    v: { block: Block, elseBlock: null | Block },
    p: Pos,
  };

  export type Loop = {
    t: 'loop',
    v: Block,
    p: Pos,
  };

  export function Program(programText: string): Program {
    const program: Program = parserUntyped.parse(programText);

    const lines = programText.split('\n');
    let lineCount = lines.length;

    if (lines[lines.length - 1] === '') {
      // Don't count trailing newline as a line
      lineCount--;
    }

    if (program.p[1][1][0] !== lineCount) {
      program.p[1][1] = [lineCount, 1];
    }

    return program;
  }
}

export default Syntax;
