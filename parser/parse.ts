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
    BreakStatement |
    { t: 'continue', p: Pos } |
    IfStatement |
    ForStatement |
    Import |
    never
  );

  export type BreakStatement = { t: 'break', p: Pos };

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

  // TODO: Need a separate .t for program (body? distinguish between body that
  // needs a return and block that doesn't.)
  export type Program = Block;

  export type Element = Block | Statement | Expression;

  export function Children(el: Element): Element[] {
    switch (el.t) {
      case 'block': { return el.v; }
      case 'array': { return el.v; }

      case 'object': {
        return el.v.map(([, expression]) => expression);
      }

      case 'e': { return [el.v]; }
      case 'return': { return [el.v]; }
      case 'if': { return el.v; }
      case 'break': { return [] };
      case 'continue': { return [] };

      case 'for': {
        const [typeClause, block] = el.v;

        const typeClauseChildren: Expression[] = (() => {
          const [type] = typeClause;

          switch (type) {
            case 'loop': return [];

            case 'condition': {
              // return [];
              const [, expression] = typeClause;

              if (typeof expression === 'string') {
                // This is not reachable, but Typescript doesn't know that
                // because it's not good at control flow analysis for tuples.
                // TODO: Don't use tuples :-(.
                throw new Error('Should not be possible');
              }

              return [expression];
            }

            case 'of': {
              const [, , expression] = typeClause;

              if (typeof expression === 'string') {
                // This is not reachable, but Typescript doesn't know that
                // because it's not good at control flow analysis for tuples.
                // TODO: Don't use tuples :-(.
                throw new Error('Should not be possible');
              }

              return [expression];
            }

            case 'traditional': {
              const [, init, cond, inc] = typeClause;

              if (
                typeof init === 'string' ||
                typeof cond === 'string' ||
                typeof inc === 'string'
              ) {
                // This is not reachable, but Typescript doesn't know that
                // because it's not good at control flow analysis for tuples.
                // TODO: Don't use tuples :-(.
                throw new Error('Should not be possible');
              }

              return [init, cond, inc];
            }
          }
        })();

        return [...typeClauseChildren, block];
      }

      case 'import': {
        // TODO: The first element here is an identifier but the parser is
        // providing it as a raw string. The parser should be changed not to
        // do that - passing through the identifier syntax element would be
        // simpler. There are other examples of this, e.g. function names.
        const [, fromString] = el.v;

        if (typeof fromString === 'string') {
          // This is not reachable, but Typescript doesn't know that
          // because it's not good at control flow analysis for tuples.
          // TODO: Don't use tuples :-(.
          throw new Error('Should not be possible');
        }

        return fromString ? [fromString] : [];
      }

      case 'NUMBER': { return []; }
      case 'IDENTIFIER': { return []; }
      case 'STRING': { return []; }

      case 'switch': {
        const res: Element[] = [];

        const [valueClause, cases] = el.v;

        if (valueClause !== null) {
          res.push(valueClause);
        }

        for (const case_ of cases) {
          res.push(...case_);
        }

        return res;
      }

      case 'func': {
        // TODO: Identifiers
        const [, , body] = el.v;
        return body.t === 'block' ? [body] : [body.v];
      }

      case 'class': {
        // TODO
        return [];
      }

      case 'subscript': { return el.v; }

      case 'functionCall': {
        const [fn, args] = el.v;
        return [fn, ...args];
      }

      case 'methodCall': {
        const [instance, , args] = el.v;
        return [instance, ...args];
      }

      case '.': {
        const [expression] = el.v;
        return [expression];
      }

      default: {
        // Operators. TODO: Need an extra layer with .t so there aren't an
        // unmanageable number of cases.
        const value: (
          [Expression, Expression] |
          Expression
        ) = el.v;

        if (Array.isArray(value)) {
          return value;
        }

        return [value];
      }
    }
  }

  export function expressionFromElement(el: Element): Expression | null {
    switch (el.t) {
      case 'e':
      case 'return':
      case 'break':
      case 'continue':
      case 'if':
      case 'for':
      case 'import':
      case 'block':
      case 'IDENTIFIER':
        return null;

      default:
        return el;
    }
  }

  export function ExpressionChildren(el: Element): Expression[] {
    const expChildren = [];

    for (const child of Children(el)) {
      const expChild = expressionFromElement(child);

      if (expChild !== null) {
        expChildren.push(expChild);
      }
    }

    return expChildren;
  }
}

export function parse(programText: string): Syntax.Program {
  return parserUntyped.parse(programText);
}
