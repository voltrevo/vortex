export default function traverse<E, T>(
  element: E,
  visit: (el: E) => T[],
  Children: (el: E) => E[],
): T[] {
  const results: T[] = [];

  for (const child of Children(element)) {
    results.push(...traverse(child, visit, Children));
  }

  results.push(...visit(element));

  return results;
}
