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
        const lines = [];

        lines.push(
          ...Expression(statement.v.cond),
          'if {',
          ...Block(statement.v.block).map(line => `  ${line}`),
        );

        if (statement.v.else_ === null) {
          lines.push('}');
        } else if (statement.v.else_.t === 'if') {
          lines.push(
            '} else {',
            ...Statement(statement.v.else_).map(line => `  ${line}`),
            '}',
          );
        } else {
          lines.push(
            '} else {',
            ...Block(statement.v.else_).map(line => `  ${line}`),
            '}',
          );
        }

        return lines;
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

      case 'breakpoint': return ['breakpoint'];

      case 'import':
        return [`'Not implemented: import statement' throw`];
    }
  }

  function isLiteral(exp: Syntax.Expression): boolean {
    switch (exp.t) {
      case 'NUMBER':
      case 'BOOL':
      case 'NULL':
      case 'STRING':
        return true;

      case 'Array': {
        return exp.v.every(isLiteral);
      }

      case 'Object': {
        return exp.v.every(([key, val]) => (
          (isLiteral(key) || key.t === 'IDENTIFIER') &&
          isLiteral(val)
        ));
      }

      default:
        return false;
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

      case 'Func': {
        const lines: string[] = [];

        lines.push(`func {`);

        for (let i = exp.v.args.length - 1; i >= 0; i--) {
          const arg = exp.v.args[i];

          if (arg.v.t !== 'IDENTIFIER') {
            lines.push(`  'Not implemented: non-identifier arguments' throw`);
            continue;
          }

          lines.push(`  set $${arg.v.v}`);
        }

        const bodyLines = (() => {
          switch (exp.v.body.t) {
            case 'block': {
              return Block(exp.v.body);
            }

            case 'expBody': {
              return Expression(exp.v.body.v);
            }
          }
        })();

        lines.push(...bodyLines.map(line => '  ' + line));

        lines.push(`}`);

        return lines;
      }

      case 'op': {
        return [`func { ${exp.v} }`];
      }

      case 'Array': {
        if (isLiteral(exp)) {
          return ['[' + exp.v.map(el => Expression(el)[0]).join(', ') + ']'];
        }

        const lines: string[] = ['[]'];

        for (const el of exp.v) {
          lines.push(...Expression(el), 'push-back');
        }

        return lines;
      }

      case 'Object': {
        if (isLiteral(exp)) {
          return [
            '{' +
            exp.v.map(([key, val]) => (
              (
                key.t === 'IDENTIFIER' ?
                `'${key.v}'` :
                Expression(key)
              ) +
              ': ' +
              Expression(val)[0]
            )).join(', ') +
            '}',
          ];
        }

        const lines: string[] = ['{}'];

        for (const [key, val] of exp.v) {
          lines.push(
            ...Expression(key),
            ...Expression(val),
            'insert',
          );
        }

        return lines;
      }

      case '.':
      case 'functionCall':
      case 'methodLookup':
      case 'subscript':
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
