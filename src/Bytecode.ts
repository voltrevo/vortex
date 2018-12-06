import Syntax from './parser/Syntax';

namespace Bytecode {
  export function Block(program: Syntax.Program): string[] {
    const lines: string[] = [];

    const hoists: Syntax.FunctionExpression[] = [];
    const statements: Syntax.Statement[] = [];

    for (const statement of program.v) {
      if (statement.t === 'e' && statement.v.t === 'Func') {
        hoists.push(statement.v);
      } else {
        statements.push(statement);
      }
    }

    let first = true;

    for (const hoist of hoists) {
      if (hoist.v.name === null) {
        // Anonymous hoist is meaningless. Validation emits a warn about this.
        continue;
      }

      if (!first) {
        lines.push('');
      }

      lines.push(`gfunc $${hoist.v.name.v} {`);

      for (let i = hoist.v.args.length - 1; i >= 0; i--) {
        const arg = hoist.v.args[i];

        if (arg.v.t !== 'IDENTIFIER') {
          lines.push(`  'Not implemented: non-identifier arguments' throw`);
          continue;
        }

        lines.push(`  set $${arg.v.v}`);
      }

      const bodyLines = (() => {
        switch (hoist.v.body.t) {
          case 'block': {
            return Block(hoist.v.body);
          }

          case 'expBody': {
            return Expression(hoist.v.body.v);
          }
        }
      })();

      lines.push(...bodyLines.map(line => '  ' + line));

      lines.push(`}`);

      first = false;
    }

    for (const statement of statements) {
      if (!first) {
        lines.push('');
      }

      lines.push(...Statement(statement));
      first = false;
    }

    return lines;
  }

  export function Statement(statement: Syntax.Statement): string[] {
    switch (statement.t) {
      case 'e': return Expression(statement.v);

      case 'return':
      case 'assert':
      case 'log.info':
      case 'log.warn':
      case 'log.error':
        return [...Expression(statement.v), statement.t];

      case 'break': return ['break'];
      case 'continue': return ['continue'];

      case 'if': {
        return [
          ...Expression(statement.v.cond),
          'if {',
          ...Block(statement.v.block).map(line => `  ${line}`),
          '}',
          ...(
            statement.v.else_ !== null ?
            [`'Not implemented: else clause' throw`] :
            []
          )
        ];
      }

      case 'for': {
        if (statement.v.control === null) {
          return [
            'loop {',
            ...Block(statement.v.block).map(line => '  ' + line),
            '}',
          ];
        }

        const forLines: string[] = [];

        forLines.push(...(() => {
          switch (statement.v.control.t) {
            case 'range': return [`'Not implemented: range for loop' throw`];
            case 'condition': return [];

            case 'setup; condition; next': {
              return Expression(statement.v.control.v[0]);
            }
          }
        })());

        forLines.push('loop {');

        forLines.push(...(() => {
          switch (statement.v.control.t) {
            case 'range': return [];

            case 'condition': {
              return [
                ...Expression(statement.v.control.v),
                '! if {',
                '  break',
                '}',
                '',
              ];
            }

            case 'setup; condition; next': {
              return [
                ...Expression(statement.v.control.v[1]),
                '! if {',
                '  break',
                '}',
                '',
              ];
            }
          }
        })().map(line => '  ' + line));

        const blockLines = Block(statement.v.block);

        if (statement.v.control.t === 'setup; condition; next') {
          for (const line of blockLines) {
            // TODO: Matching on compiled string line here is not ideal
            // (Also making use of indenting to avoid nested continues)
            if (line === 'continue') {
              forLines.push(
                `  'Not implemented: continue statement inside iteration ` +
                `for loop' throw`
              );
            } else {
              forLines.push('  ' + line);
            }
          }

          forLines.push(
            '  ',
            ...Expression(statement.v.control.v[2]).map(line => '  ' + line),
          );
        } else {
          forLines.push(...blockLines.map(line => '  ' + line));
        }

        forLines.push('}');

        return forLines;
      }

      case 'import':
      case 'breakpoint':
        return [`'Not implemented: ${statement.t} statement' throw`];
    }
  }

  export function Expression(exp: Syntax.Expression): string[] {
    switch (exp.t) {
      case 'IDENTIFIER': return [`get $${exp.v}`];
      case 'NUMBER': return [exp.v];
      case 'BOOL': return [exp.v.toString()];
      case 'NULL': return ['null'];
      case 'STRING': return [`${exp.v}`];

      case 'unary --':
      case 'unary ++': {
        if (exp.v.t !== 'IDENTIFIER') {
          // TODO: Check this is actually caught during validation
          throw new Error('Should have been caught during validation');
        }

        return [[
          `get $${exp.v.v}`,
          `${exp.t === 'unary ++' ? 'inc' : 'dec'}`,
          `set $${exp.v.v}`,
        ].join(' ')];
      }

      case 'unary -':
      case 'unary !':
      case 'unary ~': {
        const opString = (() => {
          switch (exp.t) {
            case 'unary -': return 'negate';
            case 'unary !': return '!';
            case 'unary ~': return '~';
          }
        })();

        return [...Expression(exp.v), opString];
      }

      // TODO: Should this operator even exist?
      case 'unary +': return [`'Not implemented: unary + expression' throw`];

      case '.':
      case 'functionCall':
      case 'methodLookup':
      case 'subscript':
      case 'Func':
      case 'op':
      case 'Array':
      case 'Object':
      case 'class':
      case 'switch':
      case 'import':
        return [`'Not implemented: ${exp.t} expression' throw`];

      case '**':
      case '<<':
      case '>>':
      case '<=':
      case '>=':
      case '==':
      case '!=':
      case '&&':
      case '||':
      case '*':
      case '/':
      case '%':
      case '-':
      case '+':
      case '++':
      case '<':
      case '>':
      case '&':
      case '^':
      case '|': {
        const [leftExp, rightExp] = exp.v;

        return [
          ...Expression(leftExp),
          ...Expression(rightExp),
          exp.t,
        ];
      }

      case '=':
      case ':=': {
        const [leftExp, rightExp] = exp.v;

        if (leftExp.t !== 'IDENTIFIER') {
          return [
            `'Not implemented: assign/create with non-identifier lhs' throw`
          ];
        }

        return [...Expression(rightExp), `set $${leftExp.v}`];
      }

      case '+=':
      case '++=':
      case '-=':
      case '*=':
      case '/=':
      case '%=':
      case '<<=':
      case '>>=':
      case '&=':
      case '^=':
      case '|=': {
        const [leftExp, rightExp] = exp.v;

        if (leftExp.t !== 'IDENTIFIER') {
          return [
            `'Not implemented: compound assignment with non-identifier lhs' ` +
            `throw`
          ];
        }

        const opString = exp.t.substring(0, exp.t.length - 1);

        return [
          `get $${leftExp.v}`,
          ...Expression(rightExp),
          opString,
          `set $${leftExp.v}`,
        ];
      }
    }
  }
}

export default Bytecode;