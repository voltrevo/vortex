export default function SecondsDiff(
  t1: [number, number],
  t2: [number, number]
) {
  return (t2[0] - t1[0]) + (1 / 1000000000) * (t2[1] - t1[1]);
}
