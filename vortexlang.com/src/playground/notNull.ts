export default function notNull<T>(value: T | null): T {
  if (value === null) {
    throw new Error();
  }

  return value;
}
