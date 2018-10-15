type SB = {
  root: {};
  entry: {
    origin: {};
    data: {};
  };
};

type Scope<S extends SB> = Scope.Root<S> | Scope.Map<S> ;

function Scope<S extends SB>(root: S['root']): Scope<S> {
  return { root };
}

namespace Scope {
  export type Root<S extends SB> = { root: S['root'] };

  export function Root<S extends SB>(root: S['root']): Root<S> {
    return { root };
  }

  export type Map<S extends SB> = {
    parent: Scope<S>;
    entries: {
      [name: string]: S['entry'];
    };
  };

  export function Map<S extends SB>(root: S['root']): Map<S> {
    return {
      parent: Root(root),
      entries: {},
    }
  }

  export function add<S extends SB>(
    s: Map<S>,
    name: string,
    entry: S['entry'],
  ): Map<S> {
    return {
      parent: s.parent,
      entries: { ...s.entries,
        [name]: entry,
      },
    };
  }

  export function get<S extends SB>(
    s: Scope<S>,
    name: string
  ): S['entry'] | null {
    if ('root' in s) {
      return null;
    }

    return s && (
      (s.entries[name] || null) ||
      get(s.parent, name)
    );
  }

  export function set<S extends SB>(
    s: Map<S>,
    name: string,
    mods: Partial<S['entry']['data']>,
  ): Map<S> {
    const curr = s.entries[name];

    if (curr) {
      return {
        parent: s.parent,
        entries: {
          ...s.entries,
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

    if ('root' in s.parent) {
      throw new Error('Tried to modify entry that doesn\'t exist');
    }

    return {
      parent: set(s.parent, name, mods),
      entries: s.entries,
    };
  }

  export function push<S extends SB>(
    s: Scope<S> | Scope.Root<S>,
  ): Scope.Map<S> {
    return {
      parent: s,
      entries: {},
    };
  }

  export function pop<S extends SB>(
    s: Map<S>,
  ): Scope<S> {
    return s.parent;
  }
}

export default Scope;
