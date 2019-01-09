import { default as Analyzer, Outcome } from './Analyzer';

export default async function runConsoleApp(
  az: Analyzer,
  reducer: Outcome.Func,
  render: (value: string) => void,
  getInput: () => Promise<string | null>,
) {
  let state: Outcome = Outcome.Null();
  let action: Outcome = Outcome.Number(Math.random());

  while (true) {
    if (state.cat !== 'concrete') {
      render('Reached unexpected state: ' + Outcome.LongString(state));
      return;
    }

    [state, az] = Analyzer.analyze.functionCallValue(
      az,
      null,
      reducer,
      [state, action],
    );

    if (state.t !== 'Object' || state.v.display === undefined) {
      render(
        'Expected state ' + Outcome.LongString(state) +
        ' to have a display key'
      );

      return;
    }

    const display = state.v.display;

    if (display.t !== 'String') {
      render(
        'Expected display to be a string but it was a(n) ' +
        display.t
      );

      return;
    }

    render(display.v);

    const input = await getInput();

    if (input === null) {
      return;
    }

    action = Outcome.String(input);
  }
}
