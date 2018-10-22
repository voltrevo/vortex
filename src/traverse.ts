export default function traverse<E, T>(
  element: E,
  visit: (el: E) => T[],
  Children: (el: E) => E[],
): T[] {
  const results: T[] = [];

  try {
    for (const child of Children(element)) {
      results.push(...traverse(child, visit, Children));
    }
  } catch (e) {
    (global as any).res = Children(element);
    debugger;
    (global as any).res = Children(element);
    throw e;
  }

  results.push(...visit(element));

  return results;
}
