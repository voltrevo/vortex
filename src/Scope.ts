import Syntax from './parser/Syntax';

type Scope<T> = {
  parent: Scope<T> | null;
  variables: {
    [name: string]: Scope.Variable<T>;
  };
};

function Scope<T>(): Scope<T> {
  return {
    parent: null,
    variables: {},
  };
}

namespace Scope {
  export type Variable<T> = {
    origin: Syntax.Identifier;
    data: T;
  };

  export function add<T>(
    s: Scope<T>,
    name: string,
    variable: Variable<T>,
  ): Scope<T> {
    return {
      parent: s.parent,
      variables: { ...s.variables,
        [name]: variable,
      },
    };
  }

  export function get<T>(
    s: Scope<T> | null,
    name: string
  ): Variable<T> | null {
    return s && (
      (s.variables[name] || null) ||
      get(s.parent, name)
    );
  }

  export function set<T>(
    s: Scope<T>,
    name: string,
    mods: Partial<T>,
  ): Scope<T> {
    const curr = s.variables[name];

    if (curr) {
      return {
        parent: s.parent,
        variables: {
          ...s.variables,
          // any needed because of this Typescript limitation:
          // https://github.com/Microsoft/TypeScript/issues/20510
          // 'working as intended' they say...
          [name]: {
            ...curr,
            data: {
              ...(curr as any).data,
              ...(mods as any)
            }
          }
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

  export function push<T>(s: Scope<T> | null): Scope<T> {
    return {
      parent: s,
      variables: {},
    };
  }

  export function pop<T>(s: Scope<T>): Scope<T> | null {
    return s.parent;
  }
}

export default Scope;
