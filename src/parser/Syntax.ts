declare function require(name: string): any;

const { parser: parserUntyped } = require('./vortex.js');

namespace Syntax {
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
    // := is excluded on purpose - creation is not assignment, assignment is
    // mutation
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
    '--' |
    '++' |
    'unary -' |
    'unary +' |
    never
  );

  export type CPos = [number, number];
  export type Pos = [string, [CPos, CPos]];

  export type Identifier = { t: 'IDENTIFIER', v: string, p: Pos };
  export type ArrayExpression = { t: 'array', v: Expression[], p: Pos };
  export type NUMBER = { t: 'NUMBER', v: string, p: Pos };
  export type BOOL = { t: 'BOOL', v: boolean, p: Pos };
  export type NULL = { t: 'NULL', v: null, p: Pos };
  export type STRING = { t: 'STRING', v: string, p: Pos };

  export type FunctionExpression = {
    t: 'func';
    topExp?: true;
    v: {
      name: Identifier | null,
      args: Arg[],
      body: Block | ExpressionBody
    },
    p: Pos;
  };

  export type ClassExpression = {
    t: 'class',
    v: {
      name: Identifier,
      type: (
        ['members', [Identifier, Identifier][]] |
        ['whole', Identifier] |
        never
      ),
      methods: {
        modifiers: 'static'[]
        name: Identifier,
        args: Arg[],
        body: Block | ExpressionBody,
        p: Pos,
      }[],
    },
    p: Pos,
  };

  export type FunctionCall = {
    t: 'functionCall',
    v: [Expression, Expression[]],
    p: Pos
  };

  export type Expression = { topExp?: true } & (
    Identifier |
    NUMBER |
    BOOL |
    NULL |
    STRING |
    { t: NonSpecialBinaryOperator, v: [Expression, Expression], p: Pos } |
    { t: UnaryOperator, v: Expression, p: Pos } |
    { t: '.', v: [Expression, Identifier], p: Pos } |
    FunctionCall |
    { t: 'methodCall', v: [Expression, Identifier, Expression[]], p: Pos } |
    { t: 'subscript', v: [Expression, Expression], p: Pos } |
    FunctionExpression |
    ArrayExpression |
    { t: 'object', v: [Identifier, Expression][], p: Pos } |
    ClassExpression |
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
    { t: 'assert', v: Expression, p: Pos, topExp?: true } |
    BreakStatement |
    { t: 'continue', p: Pos } |
    IfStatement |
    ForStatement |
    Import |
    { t: 'breakpoint', v: null, p: Pos } |
    never
  );

  export type BreakStatement = { t: 'break', p: Pos };

  export type IfStatement = { t: 'if', v: [Expression, Block], p: Pos };

  export type ForStatement = {
    t: 'for',
    v: {
      control: null | ForControlClause,
      block: Block
    },
    p: Pos
  };

  export type Import = { topExp?: true } & (
    { t: 'import', v: [Identifier, null], p: Pos } |
    { t: 'import', v: [Identifier, STRING], p: Pos } |
    never
  );

  export type ForControlClause = (
    { t: 'condition', v: Expression } |
    { t: 'range', v: [Identifier, Expression] } |
    { t: 'setup; condition; next', v: [Expression, Expression, Expression] } |
    never
  );

  export type Arg = {
    t: 'arg',
    v: [Identifier, Identifier | null],
    p: Pos
  };

  // TODO: Need a separate .t for program (body? distinguish between body that
  // needs a return and block that doesn't.)
  export type Program = Block;

  export type Element = { topExp?: true } & (
    Block |
    Statement |
    Expression |
    Arg |
    never
  );

  export function Children(el: Element): Element[] {
    // TODO: Need an extra layer with .t so there aren't an unmanageable number
    // of cases.
    switch (el.t) {
      case 'breakpoint':
      case 'NUMBER':
      case 'BOOL':
      case 'NULL':
      case 'STRING':
      case 'IDENTIFIER': {
        return [];
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
      case 'assert': {
        const value: (
          [Expression, Expression] |
          Expression
        ) = el.v;

        if (Array.isArray(value)) {
          return value;
        }

        return [value];
      }

      case 'arg': { return []; }
      case 'block': { return el.v; }
      case 'array': { return el.v; }

      case 'object': {
        const children: Syntax.Element[] = [];

        for (const [identifier, expression] of el.v) {
          children.push(identifier, expression);
        }

        return children;
      }

      case 'e': { return [el.v]; }
      case 'return': { return [el.v]; }
      case 'if': { return el.v; }
      case 'break': { return [] };
      case 'continue': { return [] };

      case 'for': {
        const { control, block } = el.v;

        const controlClauseChildren: Expression[] = (() => {
          if (control === null) {
            return [];
          }

          switch (control.t) {
            case 'condition': {
              return [control.v];
            }

            case 'range': {
              // TODO: Identifier should be considered a child too. Probably
              // fix this when implementing non-identifier lvalues.
              const [, rangeExp] = control.v;
              return [rangeExp];
            }

            case 'setup; condition; next': {
              return [...control.v];
            }
          }
        })();

        return [...controlClauseChildren, block];
      }

      case 'import': {
        // TODO: The first element here is an identifier but the parser is
        // providing it as a raw string. The parser should be changed not to
        // do that - passing through the identifier syntax element would be
        // simpler. There are other examples of this, e.g. function names.
        const [identifier, fromString] = el.v;

        if (typeof fromString === 'string') {
          // This is not reachable, but Typescript doesn't know that
          // because it's not good at control flow analysis for tuples.
          // TODO: Don't use tuples :-(.
          throw new Error('Should not be possible');
        }

        return [
          identifier,
          ...(fromString ? [fromString] : []),
        ];
      }

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
        const { name, args, body } = el.v;

        return [
          ...(name ? [name] : []),
          ...args,
          body.t === 'block' ? body : body.v,
        ];
      }

      case 'class': {
        // TODO
        return [el.v.name];
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
    }
  }

  export function expressionFromElement(el: Element): Expression | null {
    switch (el.t) {
      case 'arg':
      case 'e':
      case 'return':
      case 'assert':
      case 'break':
      case 'breakpoint':
      case 'continue':
      case 'if':
      case 'for':
      case 'block':
      case 'IDENTIFIER': // TODO: identifiers are not expressions?
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

  export function Program(programText: string): Program {
    return parserUntyped.parse(programText);
  }
}

export default Syntax;
