import Syntax from './parser/vasm/Syntax';

function serializeAsmTree(program: Syntax.Program): string[] {
  const ctx = {
    gfuncs: [],
    gfuncLabels: [],
    varLabels: [],
  };

  const entryLines = serializeAsmTree.Program(ctx, program);

  return [...ctx.gfuncs, ...entryLines];
}

namespace serializeAsmTree {
  type Context = {
    gfuncs: string[],
    gfuncLabels: string[],
    varLabels: string[],
  };

  export function Program(
    ctx: Context,
    program: Syntax.Program,
  ): string[] {
    const res: string[] = [];

    for (const statement of program.v) {
      res.push(...Statement(ctx, statement));
    }

    return res;
  }

  function getLabel(labels: string[], name: string) {
    let index = labels.indexOf(name);

    if (index === -1) {
      index = labels.length;
      labels.push(name);
    }

    return index;
  }

  function clearLabel(labels: string[], name: string) {
    let index = labels.indexOf(name);

    if (index === -1) {
      return;
    }

    labels[index] = '';
  }

  export function Value(value: Syntax.Value): string {
    switch (value.t) {
      case 'null':
      case 'bool':
      case 'number':
      case 'string': {
        return `${value.v}`;
      }

      case 'array': {
        return Array_(value.v);
      }

      case 'object': {
        return Object_(value.v);
      }
    }
  }

  export function Statement(
    ctx: Context,
    statement: Syntax.Statement,
  ): string[] {
    switch (statement.t) {
      case 'get':
      case 'set': {
        return [`${statement.t} ${getLabel(ctx.varLabels, statement.v)}`];
      }

      case 'gcall': {
        return [`${statement.t} ${getLabel(ctx.gfuncLabels, statement.v)}`];
      }

      case 'hoist': {
        clearLabel(ctx.gfuncLabels, statement.v);
        return [];
      }

      case 'word': {
        return [`${statement.v}`];
      }

      case 'null':
      case 'bool':
      case 'number':
      case 'string':
      case 'array':
      case 'object': {
        return [Value(statement)];
      }

      case 'func': {
        return [
          'func {',
          ...Program(
            {
              gfuncs: ctx.gfuncs,
              gfuncLabels: ctx.gfuncLabels,
              varLabels: [],
            },
            statement.v,
          ).map(line => '  ' + line),
          '}',
        ];
      }

      case 'gfunc': {
        ctx.gfuncs.push(
          `gfunc ${getLabel(ctx.gfuncLabels, statement.v.nlabel)} {`,
          ...Program(
            {
              gfuncs: ctx.gfuncs,
              gfuncLabels: ctx.gfuncLabels,
              varLabels: [],
            },
            statement.v.block,
          ).map(line => '  ' + line),
          '}',
        );

        return [];
      }

      case 'if': {
        const res = [
          'if {',
          ...Program(ctx, statement.v.block).map(line => '  ' + line),
        ];

        if (statement.v.elseBlock === null) {
          res.push('}');
        } else {
          res.push(
            '} else {',
            ...Program(ctx, statement.v.elseBlock).map(line => '  ' + line),
            '}',
          );
        }

        return res;
      }

      case 'loop': {
        return [
          'loop {',
          ...Program(ctx, statement.v).map(line => '  ' + line),
          '}',
        ];
      }
    }
  }

  export function Array_(arr: Syntax.Value[]): string {
    return '[' + arr.map(Value).join(', ') + ']';
  }

  export function Object_(obj: [Syntax.Value, Syntax.Value][]): string {
    return (
      '{' +
      obj.map(([key, val]) => Value(key) + ': ' + Value(val)).join(', ') +
      '}'
    );
  }
}

export default serializeAsmTree;
