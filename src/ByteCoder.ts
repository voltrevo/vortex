import CapturedNames from './CapturedNames';
import formatLocation from './formatLocation';
import Package from './Package';
import Syntax from './parser/Syntax';

type ByteCoder = {
  file: string,

  names: {
    [name: string]: (
      { t: 'gfunc', captures: string[] } |
      { t: 'mfunc', fullName: string } |
      undefined
    )
  },

  internalNames: {
    [name: string]: number | undefined,
  },
};

function ByteCoder(file: string): ByteCoder {
  return {
    file,
    names: {},
    internalNames: {},
  };
}

namespace ByteCoder {
  function setGFunc(coder: ByteCoder, name: string, captures: string[]): ByteCoder {
    return { ...coder,
      names: { ...coder.names,
        [name]: { t: 'gfunc', captures },
      },
    };
  }

  function setMFunc(coder: ByteCoder, name: string, fullName: string): ByteCoder {
    return { ...coder,
      names: { ...coder.names,
        [name]: { t: 'mfunc', fullName },
      },
    };
  }

  function getName(coder: ByteCoder, name: string): string[] {
    const entry = coder.names[name];

    if (entry === undefined) {
      return [`get $${name}`];
    }

    switch (entry.t) {
      case 'gfunc': {
        if (entry.captures.length === 0) {
          return [`func { gcall $${name} }`];
        }

        const lines = [`func { gcall $.captureless.${name} }`];

        for (const capture of entry.captures) {
          const getNameLines = getName(coder, capture);

          if (getNameLines.length === 1) {
            lines.push(getNameLines[0] + ' bind');
          } else {
            lines.push(...getNameLines, 'bind');
          }
        }

        return lines;
      }

      case 'mfunc': {
        return [`mcall $${entry.fullName}`];
      }
    }
  }

  function getInternalName(
    coder: ByteCoder,
    name: string
  ): [string, ByteCoder] {
    let entry = coder.internalNames[name];

    if (entry === undefined) {
      return [
        `.${name}`,
        { ...coder,
          internalNames: { ...coder.internalNames,
            [name]: 1,
          },
        }
      ];
    }

    entry++;

    return [
      `.${name}.${entry}`,
      { ...coder,
        internalNames: { ...coder.internalNames,
          [name]: entry,
        },
      },
    ];
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

    const hoistCaptureMap: { [name: string]: string[]; } = {};
    const hoistCaptureMapExt: { [name: string]: string[]; } = {};

    for (const hoist of hoists) {
      if (hoist.v.name === null) {
        // Anonymous hoist is meaningless. Validation emits a warn about this.
        continue;
      }

      hoistCaptureMap[hoist.v.name.v] = CapturedNames(hoist);
    }

    const hoistNames = Object.keys(hoistCaptureMap)

    for (const hoistName of hoistNames) {
      const deps: string[] = [hoistName];
      const seen: string[] = [];
      const capturesExt: string[] = [];

      while (true) {
        const dep = deps.shift();

        if (dep === undefined) {
          break;
        }

        seen.push(dep);

        for (const capture of hoistCaptureMap[dep]) {
          if (hoistNames.indexOf(capture) !== -1) {
            if (seen.indexOf(capture) === -1) {
              deps.push(capture);
            }
          } else {
            if (capturesExt.indexOf(capture) === -1) {
              capturesExt.push(capture);
            }
          }
        }
      }

      hoistCaptureMapExt[hoistName] = capturesExt;
    }

    for (const hoist of hoists) {
      if (hoist.v.name === null) {
        // Anonymous hoist is meaningless. Validation emits a warn about this.
        continue;
      }

      const captures = hoistCaptureMapExt[hoist.v.name.v];

      if (
        captures.length === 0 ||
        (captures.length === 1 && captures[0] === hoist.v.name.v)
      ) {
        coder = setGFunc(coder, hoist.v.name.v, []);
        lines.push(`hoist $${hoist.v.name.v}`);
      } else {
        coder = setGFunc(coder, hoist.v.name.v, captures);
        lines.push(`hoist $.captureless.${hoist.v.name.v}`);
      }
    }

    for (const hoist of hoists) {
      if (hoist.v.name === null) {
        // Anonymous hoist is meaningless. Validation emits a warn about this.
        continue;
      }

      const entry = coder.names[hoist.v.name.v];

      if (entry === undefined || entry.t !== 'gfunc') {
        throw new Error('Shouldn\'t be possible');
      }

      const captures = entry.captures;
      const directCaptures = hoistCaptureMap[hoist.v.name.v];

      lines.push('');

      if (
        captures.length === 0 ||
        (captures.length === 1 && captures[0] === hoist.v.name.v)
      ) {
        lines.push(`gfunc $${hoist.v.name.v} {`);
      } else {
        lines.push(`gfunc $.captureless.${hoist.v.name.v} {`);
      }

      const captureLines: string[] = [];
      const relabelledCaptures: string[] = [];

      for (const capture of captures) {
        if (directCaptures.indexOf(capture) !== -1) {
          captureLines.push(`  set $${capture}`);
          relabelledCaptures.push(capture);
        } else {
          // It turns out that scope validation prevents constructing a case
          // that requires this .indirect.* relabelling. However, it makes the
          // generated vasm more readable, so I'm leaving it in for now.
          const relabel = `.indirect.${capture}`;
          captureLines.push(`  set $${relabel}`);
          relabelledCaptures.push(relabel);
        }
      }

      let innerCoder = coder;

      innerCoder = { ...innerCoder,
        names: { ...innerCoder.names,
          [hoist.v.name.v]: { t: 'gfunc', captures: relabelledCaptures },
        },
      };

      captureLines.reverse();
      lines.push(...captureLines);

      for (let i = hoist.v.args.length - 1; i >= 0; i--) {
        const arg = hoist.v.args[i];

        lines.push(
          ...Destructure(coder, arg.v, 'insert').map(line => '  ' + line)
        );
      }

      for (const hoistName of hoistNames) {
        if (hoistName === hoist.v.name.v) {
          continue;
        }

        const otherCaptures = (hoistCaptureMapExt[hoistName]
          .map(otherCapture => {
            if (directCaptures.indexOf(otherCapture) === -1) {
              return '.indirect.' + otherCapture;
            }

            return otherCapture;
          })
        );

        innerCoder = { ...innerCoder,
          names: { ...innerCoder.names,
            [hoistName]: { t: 'gfunc', captures: otherCaptures },
          },
        };
      }

      for (const directCapture of directCaptures) {
        const entry = coder.names[directCapture];

        if (!entry || entry.t === 'mfunc') {
          continue;
        }

        if (hoistNames.indexOf(directCapture) !== -1) {
          continue;
        }

        if (entry.captures.length > 0) {
          innerCoder = { ...innerCoder,
            names: { ...innerCoder.names,
              [directCapture]: undefined,
            },
          };
        }
      }

      const bodyLines = (() => {
        switch (hoist.v.body.t) {
          case 'block': {
            return Block(innerCoder, hoist.v.body);
          }

          case 'expBody': {
            const [exp] = Expression(innerCoder, hoist.v.body.v);
            return exp;
          }
        }
      })();

      lines.push(...bodyLines.map(line => '  ' + line));

      lines.push(`}`);
    }

    let first = (hoists.length === 0);

    for (const statement of statements) {
      let slines: string[];
      [slines, coder] = Statement(coder, statement);

      if (slines.length === 0) {
        continue;
      }

      if (!first) {
        lines.push('');
      }

      lines.push(`location '${formatLocation(statement.p)}'`, ...slines);

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
            'log' +
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

        const rangeNames = {
          range: '',
          i: '',
          len: '',
        };

        forLines.push(...(() => {
          switch (statement.v.control.t) {
            case 'range': {
              const res = [];

              // Note: If the range is a variable (which is likely), the
              // internal name is still needed unless we know that it won't be
              // modified during the loop (TODO).
              [rangeNames.range, coder] = getInternalName(coder, 'range');

              res.push(
                ...SubExpression(coder, statement.v.control.v[1]),
                `set $${rangeNames.range}`,
              );

              [rangeNames.i, coder] = getInternalName(coder, 'i');

              res.push(`0u64 set $${rangeNames.i}`);

              [rangeNames.len, coder] = getInternalName(coder, 'len');

              res.push(
                `get $${rangeNames.range} length set $${rangeNames.len}`
              );

              return res;
            }

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
            case 'range': {
              const res = [];

              const [elExp] = statement.v.control.v;

              res.push(
                `get $${rangeNames.i} get $${rangeNames.len} == if {`,
                `  break`,
                `}`,
                ``,
                `get $${rangeNames.range} get $${rangeNames.i} at`,
                ...Destructure(coder, elExp, 'insert'),
                ``,
              );

              return res;
            };

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

        if (
          statement.v.control.t === 'setup; condition; next' ||
          statement.v.control.t === 'range'
        ) {
          for (const line of blockLines) {
            // TODO: Matching on compiled string line here is not ideal
            if (line.trim() === 'continue') {
              forLines.push(
                `'Not implemented: continue statement inside iteration ` +
                `for loop' throw`
              );
            } else {
              forLines.push('  ' + line);
            }
          }

          if (statement.v.control.t === 'setup; condition; next') {
            forLines.push(
              '  ',
              ...(SubExpression(coder, statement.v.control.v[2])
                .map(line => '  ' + line)
              ),
            );
          } else {
            forLines.push(`  get $${rangeNames.i} inc set $${rangeNames.i}`);
          }
        } else {
          forLines.push(...blockLines.map(line => '  ' + line));
        }

        forLines.push('}');

        return [forLines, coder];
      }

      case 'breakpoint': return [['breakpoint'], coder];

      case 'import': {
        const resolved = Package.resolveImport(coder.file, statement);

        if (typeof resolved !== 'string') {
          return [[`'Failed to resolve import' throw`], coder];
        }

        const ident = Syntax.IdentifierFromImport(statement);

        return [[], setMFunc(coder, ident.v, resolved)];
      }
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

  function shouldUseTemporary(exp: Syntax.Expression): boolean {
    switch (exp.t) {
      case 'IDENTIFIER':
      case 'NULL':
      case 'BOOL':
      case 'NUMBER':
        return false;

      default:
        return true;
    }
  }

  export function Expression(
    coder: ByteCoder,
    exp: Syntax.Expression
  ): [string[], ByteCoder] {
    let lines: string[];
    [lines, coder] = ExpressionImpl(coder, exp);

    if (
      exp.topExp &&
      exp.t !== ':=' &&
      !Syntax.isAssignmentOperator(exp.t) &&
      ['unary ++', 'unary --', 'Func', 'class', 'import'].indexOf(exp.t) === -1
    ) {
      lines.push('discard');
    }

    return [lines, coder];
  }

  function ExpressionImpl(
    coder: ByteCoder,
    exp: Syntax.Expression
  ): [string[], ByteCoder] {
    switch (exp.t) {
      case 'IDENTIFIER': return [getName(coder, exp.v), coder];
      case 'NUMBER': return [[exp.v], coder];
      case 'BOOL': return [[exp.v.toString()], coder];
      case 'NULL': return [['null'], coder];
      case 'STRING': return [[`${exp.v}`], coder];

      case 'unary --':
      case 'unary ++': {
        return [
          UpdateInsert(
            coder,
            exp.v,
            [
              ...SubExpression(coder, exp.v),
              exp.t === 'unary ++' ? 'inc' : 'dec',
            ],
            'update',
          ),
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

        const captures: string[] = [];
        const gfuncCaptures: string[] = [];

        for (const capture of CapturedNames(exp)) {
          const entry = coder.names[capture];

          if (entry === undefined) {
            captures.push(capture);
            continue;
          }

          switch (entry.t) {
            case 'gfunc': {
              if (entry.captures.length > 0) {
                gfuncCaptures.push(capture);
              }

              break;
            }

            case 'mfunc': {
              // Don't need to register this capture because mfuncs are tracked
              // globally
              break;
            }

            default:
              checkNever(entry);
          }
        }

        if (exp.v.name !== null) {
          if (captures.length + gfuncCaptures.length > 0) {
            lines.push(`gfunc $.captureless.${exp.v.name.v} {`);
          } else {
            lines.push(`gfunc $${exp.v.name.v} {`);
          }
        } else {
          lines.push(`func {`);
        }

        const captureLines: string[] = [];

        for (const capture of [...captures, ...gfuncCaptures]) {
          captureLines.push(`  set $${capture}`);
        }

        captureLines.reverse();
        lines.push(...captureLines);

        for (let i = exp.v.args.length - 1; i >= 0; i--) {
          const arg = exp.v.args[i];

          lines.push(
            ...Destructure(coder, arg.v, 'insert').map(line => '  ' + line)
          );
        }

        let innerCoder = coder;

        for (const capture of gfuncCaptures) {
          innerCoder = { ...innerCoder,
            names: { ...innerCoder.names,
              [capture]: undefined,
            },
          };
        }

        if (exp.v.name) {
          innerCoder = { ...innerCoder,
            names: { ...innerCoder.names,
              [exp.v.name.v]: {
                t: 'gfunc',
                captures: [...captures, ...gfuncCaptures],
              },
            },
          };
        }

        const bodyLines = (() => {
          switch (exp.v.body.t) {
            case 'block': {
              return Block(innerCoder, exp.v.body);
            }

            case 'expBody': {
              let ll: string[];
              [ll, innerCoder] = Expression(innerCoder, exp.v.body.v);
              return ll;
            }
          }
        })();

        lines.push(...bodyLines.map(line => '  ' + line));

        lines.push(`}`);

        if (exp.v.name !== null) {
          if (captures.length + gfuncCaptures.length > 0) {
            lines.push(`func { gcall $.captureless.${exp.v.name.v} }`);
          } else {
            lines.push(`func { gcall $${exp.v.name.v} }`);
          }
        }

        for (const capture of gfuncCaptures) {
          lines.push(...getName(coder, capture), 'bind');
        }

        for (const capture of captures) {
          lines.push(`get $${capture} bind`);
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
        const [fn, args] = exp.v;

        // Temporary special case for :bind().
        if (fn.t === 'methodLookup') {
          const [base, method] = fn.v;

          if (method.v === 'bind' && args.length === 1) {
            return [
              [
                ...SubExpression(coder, base),
                ...SubExpression(coder, args[0]),
                'bind'
              ],
              coder,
            ];
          }
        }

        const lines: string[] = [];

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

        let switchValCode: string | null;

        if (testExp === null) {
          switchValCode = null;
        } else if (shouldUseTemporary(testExp)) {
          let switchValN: string;
          [switchValN, coder] = getInternalName(coder, 'switchVal');
          lines.push(...SubExpression(coder, testExp), `set $${switchValN}`);
          switchValCode = `get $${switchValN}`;
        } else {
          switchValCode = SubExpression(coder, testExp).join(' ');
        }

        for (const [caseLeft, caseRight] of cases) {
          if (switchValCode !== null) {
            lines.push(indent + switchValCode);
          }

          lines.push(
            ...SubExpression(coder, caseLeft).map(line => indent + line)
          );

          if (switchValCode !== null) {
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

      case 'import': {
        const resolved = Package.resolveImport(coder.file, exp);

        if (typeof resolved !== 'string') {
          return [[`'Failed to resolve import' throw`], coder];
        }

        return [[`mcall $${resolved}`], coder];
      }

      case 'class':
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

        const kind = exp.t === '=' ? 'update' : 'insert';

        if (leftExp.t === 'subscript' || leftExp.t === '.') {
          return [
            UpdateInsert(
              coder,
              leftExp,
              SubExpression(coder, rightExp),
              kind,
            ),
            coder,
          ];
        }

        return [
          [
            ...SubExpression(coder, rightExp),
            ...Destructure(coder, leftExp, kind),
          ],
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

        const compoundRightLines = [
          ...SubExpression(coder, leftExp),
          ...SubExpression(coder, rightExp),
          exp.t.substring(0, exp.t.length - 1),
        ];

        if (leftExp.t === 'subscript' || leftExp.t === '.') {
          return [
            UpdateInsert(
              coder,
              leftExp,
              compoundRightLines,
              'update',
            ),
            coder,
          ];
        }

        return [
          [
            ...compoundRightLines,
            ...Destructure(coder, leftExp, 'update'),
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

  function Destructure(
    coder: ByteCoder,
    exp: Syntax.Expression,
    kind: 'update' | 'insert',
  ): string[] {
    if (exp.t === 'IDENTIFIER') {
      return [`set $${exp.v}`];
    }

    if (exp.t === 'Array') {
      if (exp.v.length === 0) {
        return ['length 0u64 == assert'];
      }

      const res: string[] = [];

      res.push(`dup length ${exp.v.length}u64 == assert`);

      let i = 0;

      for (; i < exp.v.length - 1; i++) {
        res.push(`dup ${i}u64 at`, ...Destructure(coder, exp.v[i], kind));
      }

      res.push(`${i}u64 at`, ...Destructure(coder, exp.v[i], kind));

      return res;
    }

    if (exp.t === 'Object') {
      const res: string[] = [];

      // TODO: Assert no extraneous keys

      for (let i = 0; i < exp.v.length; i++) {
        const mdup = i === exp.v.length - 1 ? '' : 'dup ';
        const [ident, elExp] = exp.v[i];

        if (ident.t === 'IDENTIFIER') {
          res.push(
            `${mdup}'${ident.v}' at`, ...Destructure(coder, elExp, kind)
          );
        } else if (ident.t === 'STRING') {
          res.push(
            `${mdup}${ident.v} at`, ...Destructure(coder, elExp, kind)
          );
        } else {
          checkNever(ident);
        }
      }

      return res;
    }

    let destrName: string;
    [destrName, coder] = getInternalName(coder, 'destr');

    return [
      `set $${destrName}`,
      ...UpdateInsert(
        coder,
        exp,
        [`get $${destrName}`],
        kind,
      ),
    ];
  }

  function UpdateInsert(
    coder: ByteCoder,
    target: Syntax.Expression,
    rhsCode: string[],
    kind: 'update' | 'insert',
  ): string[] {
    if (target.t === 'IDENTIFIER') {
      if (rhsCode.length === 1) {
        return [`${rhsCode} set $${target.v}`];
      }

      return [...rhsCode, `set $${target.v}`];
    }

    const prefix: string[] = [];
    const suffix: string[] = [];
    let first = true;

    while (true) {
      if (target.t === 'subscript' || target.t === '.') {
        const [nextTarget, key]: [Syntax.Expression, Syntax.Expression] = target.v;

        if (first) {
          first = false;

          if (target.t === 'subscript') {
            prefix.unshift(...SubExpression(coder, key));
          } else {
            prefix.unshift(`'${key.v}'`);
          }
        } else {
          if (target.t === 'subscript') {
            if (shouldUseTemporary(key)) {
              let tempName: string;
              [tempName, coder] = getInternalName(coder, 'key');
              prefix.unshift(`dup get $${tempName} at`);
              prefix.unshift(...SubExpression(coder, key), `set $${tempName}`);
              suffix.push(`get $${tempName} swap update`);
            } else {
              const keyCode = SubExpression(coder, key).join(' ');
              prefix.unshift(`dup ${keyCode} at`);
              suffix.push(`${keyCode} swap update`);
            }
          } else {
            prefix.unshift(`dup '${key.v}' at`);
            suffix.push(`'${key.v}' swap update`);
          }
        }

        if (nextTarget.t === 'IDENTIFIER') {
          return [
            `get $${nextTarget.v}`,
            ...prefix,
            ...rhsCode,
            kind,
            ...suffix,
            `set $${nextTarget.v}`,
          ];
        }

        target = nextTarget;

        continue;
      }

      break;
    }

    return [`'Invalid update/insert target' throw`];
  }
}

function checkNever(x: never) {}

export default ByteCoder;
