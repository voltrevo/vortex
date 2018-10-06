export default function assert(value: boolean) {
  if (!value) {
    throw new Error('Assertion failure');
  }
}
