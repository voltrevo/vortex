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
  canvasEl.style.borderTop = '1px solid black';
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

      for (const path of canvasObjects.v) {
        if (path.cat !== 'concrete' || path.t !== 'Object') {
          console.error('Path was not an object', path);
          continue;
        }

        const {points, style} = path.v;

        if (
          points === undefined || points.t !== 'Array' ||
          style === undefined || style.t !== 'Object'
        ) {
          console.error('Path object invalid', path.v);
          continue;
        }

        ctx2d.beginPath();

        for (const p of points.v) {
          if (p.t !== 'Array' || p.v.length !== 2) {
            console.error('Invalid point', p, 'in', path);
            continue;
          }

          const [x, y] = p.v;

          if (x.t !== 'Number' || y.t !== 'Number') {
            console.error('Invalid point', p, 'in', path);
            continue;
          }

          ctx2d.lineTo(x.v * width, y.v * width);
        }

        ctx2d.closePath();

        const {fill, stroke} = style.v;

        if (fill !== undefined) {
          if (fill.t !== 'String') {
            console.error('Invalid fill', path);
            continue;
          }

          ctx2d.fillStyle = fill.v;
          ctx2d.fill();
        }

        if (stroke !== undefined) {
          if (stroke.t !== 'Object') {
            console.error('Invalid stroke', path);
            continue;
          }

          const {color, lineWidth} = stroke.v;

          if (color === undefined || color.t !== 'String') {
            console.error('Invalid stroke color', path);
            continue;
          }

          ctx2d.strokeStyle = color.v;

          if (lineWidth !== undefined) {
            if (lineWidth.t !== 'Number') {
              console.error('Invalid lineWidth', path);
              continue;
            }

            ctx2d.lineWidth = lineWidth.v;
          } else {
            ctx2d.lineWidth = 1;
          }

          ctx2d.stroke();
        }
      }

      break;
    }
  })().catch(err => {
    console.error(err);
  });
}
