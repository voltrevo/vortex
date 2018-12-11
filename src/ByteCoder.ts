import Syntax from './parser/Syntax';

type ByteCoder = {
  names: {
    [name: string]: (
      'gfunc' |
      undefined
    )
  },
};

function ByteCoder(): ByteCoder {
  return {
    names: {},
  };
}

namespace ByteCoder {
  function setGFunc(coder: ByteCoder, name: string): ByteCoder {
    return { ...coder,
      names: { ...coder.names,
        [name]: 'gfunc',
      },
    };
  }

  function getName(coder: ByteCoder, name: string): string {
    const entry = coder.names[name];

    if (entry === undefined) {
      return `get $${name}`;
    }

    switch (entry) {
      case 'gfunc': return `func { gcall $${name} }`;
    }
  }

  export function Block(coder: ByteCoder, program: Syntax.Program): string[] {
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

      coder = setGFunc(coder, hoist.v.name.v);
      lines.push(`hoist $${hoist.v.name.v}`);
    }

    for (const hoist of hoists) {
      if (hoist.v.name === null) {
        // Anonymous hoist is meaningless. Validation emits a warn about this.
        continue;
      }

      if (!first) {
        lines.push('');
      }

      lines.push(`gfunc $${hoist.v.name.v} {`);
      coder = setGFunc(coder, hoist.v.name.v);

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
            return Block(coder, hoist.v.body);
          }

          case 'expBody': {
            const [exp] = Expression(coder, hoist.v.body.v);
            return exp;
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

      let slines: string[];
      [slines, coder] = Statement(coder, statement);

      lines.push(...slines);

      first = false;
    }

    return lines;
  }

  export function Statement(
    coder: ByteCoder,
    statement: Syntax.Statement,
  ): [string[], ByteCoder] {
    switch (statement.t) {
      case 'e': return Expression(coder, statement.v);

      case 'return':
      case 'assert':
      case 'log.info':
      case 'log.warn':
      case 'log.error': {
        let slines: string[];
        [slines, coder] = Expression(coder, statement.v);

        if (statement.t.indexOf('log.') === 0) {
          slines.push(
            'log.' +
            statement.t[4].toUpperCase() +
            statement.t.slice(5)
          );
        } else {
          slines.push(statement.t);
        }

        return [slines, coder];
      }

      case 'break': return [['break'], coder];
      case 'continue': return [['continue'], coder];

      case 'if': {
        const lines = [];

        let ll: string[];
        [ll, coder] = Expression(coder, statement.v.cond);

        lines.push(...ll);

        lines.push(
          'if {',
          ...Block(coder, statement.v.block).map(line => `  ${line}`),
        );

        if (statement.v.else_ === null) {
          lines.push('}');
        } else if (statement.v.else_.t === 'if') {
          [ll, coder] = Statement(coder, statement.v.else_);

          lines.push(
            '} else {',
            ...ll.map(line => `  ${line}`),
            '}',
          );
        } else {
          lines.push(
            '} else {',
            ...Block(coder, statement.v.else_).map(line => `  ${line}`),
            '}',
          );
        }

        return [lines, coder];
      }

      case 'for': {
        if (statement.v.control === null) {
          return [
            [
              'loop {',
              ...Block(coder, statement.v.block).map(line => '  ' + line),
              '}',
            ],
            coder,
          ];
        }

        const forLines: string[] = [];
        let ll: string[];

        forLines.push(...(() => {
          switch (statement.v.control.t) {
            case 'range': return [`'Not implemented: range for loop' throw`];
            case 'condition': return [];

            case 'setup; condition; next': {
              [ll, coder] = Expression(coder, statement.v.control.v[0]);
              return ll;
            }
          }
        })());

        forLines.push('loop {');

        forLines.push(...(() => {
          switch (statement.v.control.t) {
            case 'range': return [];

            case 'condition': {
              [ll, coder] = Expression(coder, statement.v.control.v);

              return [
                ...ll,
                '! if {',
                '  break',
                '}',
                '',
              ];
            }

            case 'setup; condition; next': {
              [ll, coder] = Expression(coder, statement.v.control.v[1]);

              return [
                ...ll,
                '! if {',
                '  break',
                '}',
                '',
              ];
            }
          }
        })().map(line => '  ' + line));

        const blockLines = Block(coder, statement.v.block);

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

          [ll, coder] = Expression(coder, statement.v.control.v[2]);

          forLines.push('  ', ...ll.map(line => '  ' + line));
        } else {
          forLines.push(...blockLines.map(line => '  ' + line));
        }

        forLines.push('}');

        return [forLines, coder];
      }

      case 'breakpoint': return [['breakpoint'], coder];

      case 'import':
        return [[`'Not implemented: import statement' throw`], coder];
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

  export function Expression(coder: ByteCoder, exp: Syntax.Expression): [string[], ByteCoder] {
    switch (exp.t) {
      case 'IDENTIFIER': return [[getName(coder, exp.v)], coder];
      case 'NUMBER': return [[exp.v], coder];
      case 'BOOL': return [[exp.v.toString()], coder];
      case 'NULL': return [['null'], coder];
      case 'STRING': return [[`${exp.v}`], coder];

      case 'unary --':
      case 'unary ++': {
        if (exp.v.t !== 'IDENTIFIER') {
          // TODO: Check this is actually caught during validation
          throw new Error('Should have been caught during validation');
        }

        return [
          [[
            `get $${exp.v.v}`,
            `${exp.t === 'unary ++' ? 'inc' : 'dec'}`,
            `set $${exp.v.v}`,
          ].join(' ')],
          coder,
        ];
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

        let ll;
        [ll] = Expression(coder, exp.v);
        return [[...ll, opString], coder];
      }

      // TODO: Should this operator even exist?
      case 'unary +': {
        return [[`'Not implemented: unary + expression' throw`], coder];
      }

      case 'Func': {
        const lines: string[] = [];

        if (exp.v.name !== null) {
          lines.push(`gfunc $${exp.v.name} {`);
        } else {
          lines.push(`func {`);
        }

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
              return Block(coder, exp.v.body);
            }

            case 'expBody': {
              let ll: string[];
              [ll, coder] = Expression(coder, exp.v.body.v);
              return ll;
            }
          }
        })();

        lines.push(...bodyLines.map(line => '  ' + line));

        lines.push(`}`);

        if (exp.v.name !== null) {
          lines.push(`func { gcall $${exp.v.name} }`);
        }

        return [lines, coder];
      }

      case 'op': {
        return [[`func { ${exp.v} }`], coder];
      }

      case 'Array': {
        if (isLiteral(exp)) {
          return [
            [
              '[' +
              exp.v.map(el => SubExpression(coder, el)[0]).join(', ') +
              ']'
            ],
            coder,
          ];
        }

        const lines: string[] = ['[]'];

        for (const el of exp.v) {
          lines.push(...SubExpression(coder, el), 'pushBack');
        }

        return [lines, coder];
      }

      case 'Object': {
        if (isLiteral(exp)) {
          return [
            [
              '{' +
              exp.v.map(([key, val]) => (
                (
                  key.t === 'IDENTIFIER' ?
                  `'${key.v}'` :
                  SubExpression(coder, key)
                ) +
                ': ' +
                SubExpression(coder, val)[0]
              )).join(', ') +
              '}',
            ],
            coder,
          ];
        }

        const lines: string[] = ['{}'];

        for (const [key, val] of exp.v) {
          lines.push(
            ...(
              key.t === 'IDENTIFIER' ?
              [`'${key.v}'`] :
              SubExpression(coder, key)
            ),
            ...SubExpression(coder, val),
            'insert',
          );
        }

        return [lines, coder];
      }

      case '.': {
        return [
          [
            ...SubExpression(coder, exp.v[0]),
            `'${exp.v[1].v}'`,
            'at',
          ],
          coder,
        ];
      }

      case 'functionCall': {
        const lines: string[] = [];

        const [fn, args] = exp.v;

        for (const arg of args) {
          lines.push(...SubExpression(coder, arg));
        }

        lines.push(...SubExpression(coder, fn), 'call');

        return [lines, coder];
      }

      case 'methodLookup': {
        const [obj, ident] = exp.v;

        return [
          [
            ...SubExpression(coder, obj),
            `'${ident.v}'`,
            'methodLookup',
          ],
          coder,
        ];
      }

      case 'subscript': {
        return [
          [
            ...SubExpression(coder, exp.v[0]),
            ...SubExpression(coder, exp.v[1]),
            'at',
          ],
          coder,
        ];
      }

      case 'switch': {
        const lines: string[] = [];
        let indent = '';

        const [testExp, cases] = exp.v;

        for (const [caseLeft, caseRight] of cases) {
          if (testExp !== null) {
            // TODO: Use temporary variable instead
            lines.push(
              ...SubExpression(coder, testExp).map(line => indent + line)
            );
          }

          lines.push(
            ...SubExpression(coder, caseLeft).map(line => indent + line)
          );

          if (testExp !== null) {
            // TODO: Use temporary variable instead
            lines.push(indent + '==');
          }

          lines.push(indent + 'if {');

          lines.push(
            ...(SubExpression(coder, caseRight)
              .map(line => '  ' + indent + line)
            ),
            indent + '} else {',
          );

          indent += '  ';
        }

        lines.push(indent + 'false assert');

        while (indent.length > 0) {
          indent = indent.slice(0, indent.length - 2);
          lines.push(indent + '}');
        }

        return [lines, coder];
      }

      case 'class':
      case 'import':
        return [[`'Not implemented: ${exp.t} expression' throw`], coder];

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
          [
            ...SubExpression(coder, leftExp),
            ...SubExpression(coder, rightExp),
            exp.t,
          ],
          coder,
        ];
      }

      case '=':
      case ':=': {
        const [leftExp, rightExp] = exp.v;

        if (leftExp.t === 'IDENTIFIER') {
          return [
            [...SubExpression(coder, rightExp), `set $${leftExp.v}`],
            coder,
          ];
        }

        let target = leftExp;
        const prefix: string[] = [];
        const suffix: string[] = [];
        let first = true;

        while (true) {
          if (target.t === 'subscript' || target.t === '.') {
            const [nextTarget, key] = target.v;

            if (first) {
              first = false;

              if (target.t === 'subscript') {
                prefix.unshift(...SubExpression(coder, key));
              } else {
                prefix.unshift(`'${key.v}'`);
              }
            } else {
              if (target.t === 'subscript') {
                const keyLines = SubExpression(coder, key);

                // TODO: Use a temporary when appropriate rather than duplicating
                // the key calculation
                prefix.unshift('dup', ...keyLines, 'at');
                suffix.push(...keyLines, 'swap update');
              } else {
                prefix.unshift(`dup '${key.v}' at`);
                suffix.push(`'${key.v}' swap update`);
              }
            }

            if (nextTarget.t === 'IDENTIFIER') {
              return [
                [
                  `get $${nextTarget.v}`,
                  ...prefix,
                  ...SubExpression(coder, rightExp),
                  exp.t === '=' ? 'update' : 'insert',
                  ...suffix,
                  `set $${nextTarget.v}`,
                ],
                coder,
              ];
            }

            target = nextTarget;

            continue;
          }

          break;
        }

        return [
          [`'Not implemented: possible destructuring assignment' throw`],
          coder,
        ];
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
            [
              `'Not implemented: compound assignment with non-identifier ` +
              `lhs' throw`
            ],
            coder,
          ];
        }

        const opString = exp.t.substring(0, exp.t.length - 1);

        return [
          [
            `get $${leftExp.v}`,
            ...SubExpression(coder, rightExp),
            opString,
            `set $${leftExp.v}`,
          ],
          coder,
        ];
      }
    }
  }

  function SubExpression(coder: ByteCoder, exp: Syntax.Expression): string[] {
    const [ll] = Expression(coder, exp);
    return ll;
  }
}

export default ByteCoder;
