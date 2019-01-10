import { default as Analyzer, Outcome } from './Analyzer';

export default async function runConsoleApp(
  az: Analyzer,
  app: Outcome.Object,
  display: (value: string) => void,
  getInput: () => Promise<string | null>,
) {
  for (const key of ['reduce', 'render']) {
    if (!(key in app.v)) {
      display(`Missing key ${key} in app`);
      return;
    }
  }

  const {reduce, render} = app.v;

  if (reduce.t !== 'Func') {
    display('Expected reduce to be func but it was a(n) ' + reduce.t);
    return;
  }

  if (render.t !== 'Func') {
    display('Expected render to be func but it was a(n) ' + render.t);
    return;
  }

  let state: Outcome = Outcome.Null();
  let action: Outcome = Outcome.Number(Math.random());

  while (true) {
    if (state.cat !== 'concrete') {
      display('Reached unexpected state: ' + Outcome.LongString(state));
      return;
    }

    [state, az] = Analyzer.analyze.functionCallValue(
      az,
      null,
      reduce,
      [state, action],
    );

    if (state.t !== 'Object') {
      display(
        'Expected state ' + Outcome.LongString(state) + ' to be an object'
      );

      return;
    }

    let displayStr: Outcome;
    [displayStr, az] = Analyzer.analyze.functionCallValue(
      az,
      null,
      render,
      [state],
    );

    if (displayStr.t !== 'String') {
      display(
        'Expected render output to be a string but it was a(n) ' +
        displayStr.t
      );

      return;
    }

    display(displayStr.v);

    const input = await getInput();

    if (input === null) {
      return;
    }

    action = Outcome.String(input);
  }
}
