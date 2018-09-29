import { Syntax } from './parser/parse';

type Scope = {
  parent: Scope | null;
  variables: {
    [name: string]: Scope.Variable;
  };
};

function Scope(): Scope {
  return {
    parent: null,
    variables: {},
  };
}

namespace Scope {
  export type Variable = {
    origin: Syntax.Identifier;
    used: boolean;
    assigned: boolean;
  };

  export function get(s: Scope, name: string): Variable | null {
    return (
      (s.variables[name] || null) ||
      s.parent && get(s.parent, name)
    );
  }

  export function set(
    s: Scope,
    name: string,
    mods: Partial<Variable>,
  ): Scope {
    const curr = s.variables[name];

    if (curr) {
      // vault concept version:
      // return s.variables[name] += mods; // TODO hmm += or custom operator?
      // or
      // return s.variables[name] = { ...s.variables[name], ...mods };
      return {
        parent: s.parent,
        variables: {
          ...s.variables,
          [name]: { ...curr, ...mods }
        }
      };
    }

    if (!s.parent) {
      throw new Error('Tried to modify variable that doesn\'t exist');
    }

    return {
      parent: set(s.parent, name, mods),
      variables: s.variables,
    };
  }
}

export default Scope;
