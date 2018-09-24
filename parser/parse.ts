declare function require(name: string): any;

const { parser: parserUntyped } = require('./vault.js');

export namespace Syntax {
  export type CreationOperator = ':=';

  export type AssignmentOperator = (
    '+=' |
    '-=' |
    '*=' |
    '/=' |
    '%=' |
    '<<=' |
    '>>=' |
    '&=' |
    '^=' |
    '|=' |
    '=' |
    never
  );

  export function isAssignmentOperator(
    str: string
  ): str is AssignmentOperator {
    const operators = [
      '+=',
      '-=',
      '*=',
      '/=',
      '%=',
      '<<=',
      '>>=',
      '&=',
      '^=',
      '|=',
      '=',
    ];

    return operators.indexOf(str) !== -1;
  }

  export type VanillaOperator = (
    '**' |
    '<<' |
    '>>' |
    '<=' |
    '>=' |
    '==' |
    '!=' |
    '&&' |
    '||' |
    '*' |
    '/' |
    '%' |
    '-' |
    '+' |
    '<' |
    '>' |
    '&' |
    '^' |
    '|' |
    never
  );

  export type SpecialBinaryOperator = (
    '.' |
    never
  );

  export type NonSpecialBinaryOperator = (
    CreationOperator |
    AssignmentOperator |
    VanillaOperator |
    never
  );

  export type UnaryOperator = (
    'prefix --' |
    'postfix --' |
    'prefix ++' |
    'postfix ++' |
    'unary -' |
    'unary +' |
    never
  );

  export type Pos = {
    first_line: number;
    last_line: number;
    first_column: number;
    last_column: number;
  };

  export type Identifier = { t: 'IDENTIFIER', v: string, p: Pos };
  export type NUMBER = { t: 'NUMBER', v: string, p: Pos };
  export type STRING = { t: 'STRING', v: string, p: Pos };

  export type Expression = (
    NUMBER |
    Identifier |
    STRING |
    { t: NonSpecialBinaryOperator, v: [Expression, Expression], p: Pos } |
    { t: UnaryOperator, v: Expression, p: Pos } |
    { t: '.', v: [Expression, string], p: Pos } |
    { t: 'functionCall', v: [Expression, Expression[]], p: Pos } |
    { t: 'methodCall', v: [Expression, string, Expression[]], p: Pos } |
    { t: 'subscript', v: [Expression, Expression], p: Pos } |
    {
      t: 'func',
      v: [
        string | null,
        { t: 'arg', v: [string, string | null], p: Pos }[],
        Block | ExpressionBody
      ],
      p: Pos,
    } |
    { t: 'array', v: Expression[], p: Pos } |
    { t: 'object', v: [string, Expression][], p: Pos } |
    {
      t: 'class',
      v: {
        name: string,
        type: (
          ['members', [string, string][]] |
          ['whole', string] |
          never
        ),
        methods: {
          modifiers: 'static'[]
          name: string,
          args: { t: 'arg', v: [string, string | null], p: Pos }[],
          body: Block | ExpressionBody,
          p: Pos,
        }[],
      },
      p: Pos,
    } |
    { t: 'switch', v: [Expression | null, [Expression, Expression][]], p: Pos } |
    Import |
    never
  );

  type ExpressionBody = { t: 'expBody', v: Expression, p: Pos };
  export type Block = { t: 'block', v: Statement[], p: Pos };

  export type ExpressionStatement = { t: 'e', v: Expression, p: Pos };

  export type Statement = (
    ExpressionStatement |
    { t: 'return', v: Expression, p: Pos } |
    { t: 'break', p: Pos } |
    { t: 'continue', p: Pos } |
    IfStatement |
    ForStatement |
    Import |
    never
  );

  export type IfStatement = { t: 'if', v: [Expression, Block], p: Pos };
  export type ForStatement = { t: 'for', v: [ForTypeClause, Block], p: Pos };

  export type Import = (
    { t: 'import', v: [string], p: Pos } |
    { t: 'import', v: [string, STRING], p: Pos } |
    never
  );

  export type ForTypeClause = (
    ['loop'] |
    ['condition', Expression] |
    ['of', string, Expression] |
    ['traditional', Expression, Expression, Expression] |
    never
  );

  export type Program = Block;
}

export function parse(programText: string): Syntax.Program {
  return parserUntyped.parse(programText);
}
