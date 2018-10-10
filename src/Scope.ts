type VT = {
  origin: {};
  data: {};
};

type Scope<T extends VT> = {
  parent: Scope<T> | null;
  variables: {
    [name: string]: T;
  };
};

function Scope<T extends VT>(): Scope<T> {
  return {
    parent: null,
    variables: {},
  };
}

namespace Scope {
  export function add<T extends VT>(
    s: Scope<T>,
    name: string,
    variable: T,
  ): Scope<T> {
    return {
      parent: s.parent,
      variables: { ...s.variables,
        [name]: variable,
      },
    };
  }

  export function get<T extends VT>(
    s: Scope<T> | null,
    name: string
  ): T | null {
    return s && (
      (s.variables[name] || null) ||
      get(s.parent, name)
    );
  }

  export function set<T extends VT>(
    s: Scope<T>,
    name: string,
    mods: Partial<T['data']>,
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
            origin: curr.origin,
            data: {
              ...(curr as any).data,
              ...(mods as any)
            }
          } as any // (hmm...)
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

  export function push<T extends VT>(s: Scope<T> | null): Scope<T> {
    return {
      parent: s,
      variables: {},
    };
  }

  export function pop<T extends VT>(s: Scope<T>): Scope<T> | null {
    return s.parent;
  }
}

export default Scope;
