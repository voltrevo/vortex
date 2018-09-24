declare function require(name: string): any;

const { parseUntyped } = require('./vault.js');

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

  export type Identifier = { t: 'IDENTIFIER', v: string };
  export type NUMBER = { t: 'NUMBER', v: string };
  export type STRING = { t: 'STRING', v: string };

  type Expression = (
    NUMBER |
    Identifier |
    STRING |
    { t: NonSpecialBinaryOperator, v: [Expression, Expression] } |
    { t: UnaryOperator, v: Expression } |
    { t: '.', v: [Expression, string] } |
    { t: 'functionCall', v: [Expression, Expression[]] } |
    { t: 'methodCall', v: [Expression, string, Expression[]] } |
    { t: 'subscript', v: [Expression, Expression] } |
    {
      t: 'func',
      v: [
        string | null,
        [string, string | null][],
        BlockBody | ExpressionBody
      ]
    } |
    { t: 'array', v: Expression[] } |
    { t: 'object', v: [string, Expression][] } |
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
          args: [string, string | null][],
          body: BlockBody | ExpressionBody,
        }[],
      },
    } |
    { t: 'switch', v: [Expression | null, [Expression, Expression][]] } |
    Import |
    never
  );

  type ExpressionBody = { t: 'expBody', v: Expression };
  type BlockBody = { t: 'block', v: Statement[] };

  export type ExpressionStatement = { t: 'e', v: Expression };

  export type Statement = (
    ExpressionStatement |
    { t: 'return', v: Expression } |
    { t: 'break' } |
    { t: 'continue' } |
    IfStatement |
    ForStatement |
    Import |
    never
  );

  export type IfStatement = { t: 'if', v: [Expression, Block] };
  export type ForStatement = { t: 'for', v: [ForTypeClause, Block] };

  export type Import = (
    { t: 'import', v: [string] } |
    { t: 'import', v: [string, STRING] } |
    never
  );

  export type ForTypeClause = (
    ['loop'] |
    ['condition', Expression] |
    ['of', string, Expression] |
    ['traditional', Expression, Expression, Expression] |
    never
  );

  export type Block = Statement[];

  export type Program = Statement[];
}

export function parse(programText: string): Syntax.Program {
  return parseUntyped(programText);
}
