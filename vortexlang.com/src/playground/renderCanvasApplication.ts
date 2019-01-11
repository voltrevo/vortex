import * as vortex from 'vortexlang';

export default function renderCanvasApplication(
  az: vortex.Analyzer,
  app: vortex.Outcome.ConcreteObject,
  contentEl: HTMLElement,
) {
  let cleanupJobs: (() => void)[] = [];

  let intervalId: number = setInterval(() => {
    if (contentEl.parentNode === null) {
      cleanup();
    }
  }, 100) as any as number;

  function cleanup() {
    for (const job of cleanupJobs) {
      try { job(); } catch (err) { console.error(err) }
    }

    cleanupJobs.length = 0;
  }

  cleanupJobs.push(() => clearInterval(intervalId));

  const canvasEl = document.createElement('canvas');
  const ctx2d = canvasEl.getContext('2d');

  if (ctx2d === null) {
    console.error('Couldn\'t get 2d context');
    cleanup();
    return;
  }

  let width = 0;

  function updateSize() {
    ({ width } = contentEl.getBoundingClientRect());
    canvasEl.style.height = `${width}px`;
    canvasEl.setAttribute('width', `${width}`);
    canvasEl.setAttribute('height', `${width}`);
  }

  updateSize();
  contentEl.appendChild(canvasEl);

  window.addEventListener('resize', updateSize);
  cleanupJobs.push(() => window.removeEventListener('resize', updateSize));

  (async () => {
    for (const key of ['reduce', 'render']) {
      if (!(key in app.v)) {
        console.error(`Missing key ${key} in app`);
        return;
      }
    }

    const {reduce, render} = app.v;

    if (reduce.t !== 'Func') {
      console.error('Expected reduce to be func but it was a(n) ' + reduce.t);
      return;
    }

    if (render.t !== 'Func') {
      console.error('Expected render to be func but it was a(n) ' + render.t);
      return;
    }

    let state: vortex.Outcome = vortex.Outcome.Null();
    let action: vortex.Outcome = vortex.Outcome.Number(Math.random());

    while (true) {
      if (false /*state.cat === 'invalid'*/) {
        console.error('Reached unexpected state: ' + vortex.Outcome.LongString(state));
        return;
      }

      [state, az] = vortex.Analyzer.analyze.functionCallValue(
        az,
        null,
        reduce,
        [state, action],
      );

      if (state.cat === 'invalid') {
        console.error(
          'Expected state ' + vortex.Outcome.LongString(state) + ' to be valid'
        );

        return;
      }

      let canvasObjects: vortex.Outcome;
      [canvasObjects, az] = vortex.Analyzer.analyze.functionCallValue(
        az,
        null,
        render,
        [state],
      );

      if (canvasObjects.t !== 'Array') {
        console.error(
          'Expected render output to be an array but it was a(n) ' +
          canvasObjects.t
        );

        return;
      }

      ctx2d.clearRect(0, 0, width, width);
      ctx2d.fillStyle = 'blue';

      for (const obj of canvasObjects.v) {
        if (obj.cat === 'concrete' && obj.t === 'Array' && obj.v.length === 4) {
          const [x, y, w, h] = obj.v;

          if (x.t === 'Number' && y.t === 'Number' && w.t === 'Number' && h.t === 'Number') {
            ctx2d.fillRect(width * x.v, width * y.v, width * w.v, width * h.v);
          } else {
            console.error('Type error on rect inputs');
          }
        } else {
          console.error('Canvas object is not a 4 length array');
        }
      }

      break;

      /*
      const input = await getInput();

      if (input === null) {
        return;
      }

      action = vortex.Outcome.String(input);
       */
    }
  })().catch(err => {
    console.error(err);
  });
}
