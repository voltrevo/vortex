import * as vortex from 'vortexlang';

import notNull from './notNull';

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

  let alive = true;
  const startTime = Date.now();

  cleanupJobs.push(() => { alive = false; });

  const canvasEl = document.createElement('canvas');
  canvasEl.style.borderTop = '1px solid black';
  const ctx2d = notNull(canvasEl.getContext('2d'));

  let width = 0;

  function updateSize() {
    ({ width } = contentEl.getBoundingClientRect());
    canvasEl.style.height = `${width}px`;
    canvasEl.setAttribute('width', `${width}`);
    canvasEl.setAttribute('height', `${width}`);
    updateRender();
  }

  contentEl.appendChild(canvasEl);

  window.addEventListener('resize', updateSize);
  cleanupJobs.push(() => window.removeEventListener('resize', updateSize));

  for (const key of ['reduce', 'render']) {
    if (!(key in app.v)) {
      console.error(`Missing key ${key} in app`);
      return;
    }
  }

  const {init, reduce, render} = app.v;

  if (init === undefined || reduce === undefined || render === undefined) {
    console.error('Expected app to have init, reduce, render');
    return;
  }

  let state: vortex.Outcome = init;

  if (state.cat !== 'concrete') {
    console.error('Unexpected state: ' + vortex.Outcome.LongString(state));
    return;
  }

  function applyAction(action: vortex.Outcome.Value) {
    if (reduce.t !== 'Func') {
      console.error('Expected reduce to be func but it was a(n) ' + reduce.t, reduce);
      return;
    }

    if (state.cat === 'invalid') {
      console.error(
        'Expected state ' + vortex.Outcome.LongString(state) + ' to be valid'
      );

      return;
    }

    [state, az] = vortex.Analyzer.analyze.functionCallValue(
      {...az, steps: 0},
      null,
      reduce,
      [state, action],
    );

    updateRender();
  }

  function updateRender() {
    if (render.t !== 'Func') {
      console.error('Expected render to be func but it was a(n) ' + render.t, render);
      return;
    }

    if (state.cat === 'invalid') {
      console.error(
        'Expected state ' + vortex.Outcome.LongString(state) + ' to be valid'
      );

      return;
    }

    let renderData: vortex.Outcome;
    [renderData, az] = vortex.Analyzer.analyze.functionCallValue(
      {...az, steps: 0},
      null,
      render,
      [state],
    );

    if (renderData.t !== 'Object') {
      console.error(
        'Expected render data to be an object but it was a(n) ' +
        renderData.t, renderData
      );

      return;
    }

    const {events, polygons} = renderData.v;

    if (
      events === undefined || events.t !== 'Array' ||
      polygons === undefined || polygons.t !== 'Array'
    ) {
      console.error('Expected events and polygons arrays');
      return;
    }

    for (const evt of events.v) {
      if (evt.t !== 'String') {
        console.error('Non-string event', evt);
      }

      switch (evt.v) {
        case 'frame': {
          window.requestAnimationFrame(() => {
            if (!alive) {
              return;
            }

            applyAction(vortex.Outcome.Array([
              vortex.Outcome.String('frame'),
              vortex.Outcome.Object({
                time: vortex.Outcome.Number((Date.now() - startTime) / 1000),
              }),
            ]));
          });

          break;
        }

        default: console.error('Unrecognized event', evt);
      }
    }

    ctx2d.clearRect(0, 0, width, width);

    for (const poly of polygons.v) {
      if (poly.cat !== 'concrete' || poly.t !== 'Object') {
        console.error('poly was not an object', poly);
        continue;
      }

      const {points, style} = poly.v;

      if (
        points === undefined || points.t !== 'Array' ||
        style === undefined || style.t !== 'Object'
      ) {
        console.error('poly object invalid', poly.v);
        continue;
      }

      ctx2d.beginPath();

      for (const p of points.v) {
        if (p.t !== 'Array' || p.v.length !== 2) {
          console.error('Invalid point', p, 'in', poly);
          continue;
        }

        const [x, y] = p.v;

        if (x.t !== 'Number' || y.t !== 'Number') {
          console.error('Invalid point', p, 'in', poly);
          continue;
        }

        ctx2d.lineTo(x.v * width, y.v * width);
      }

      ctx2d.closePath();

      const {fill, stroke} = style.v;

      if (fill !== undefined) {
        if (fill.t !== 'String') {
          console.error('Invalid fill', poly);
          continue;
        }

        ctx2d.fillStyle = fill.v;
        ctx2d.fill();
      }

      if (stroke !== undefined) {
        if (stroke.t !== 'Object') {
          console.error('Invalid stroke', poly);
          continue;
        }

        const {color, lineWidth} = stroke.v;

        if (color === undefined || color.t !== 'String') {
          console.error('Invalid stroke color', poly);
          continue;
        }

        ctx2d.strokeStyle = color.v;

        if (lineWidth !== undefined) {
          if (lineWidth.t !== 'Number') {
            console.error('Invalid lineWidth', poly);
            continue;
          }

          ctx2d.lineWidth = lineWidth.v;
        } else {
          ctx2d.lineWidth = 1;
        }

        ctx2d.stroke();
      }
    }
  }

  updateSize();
}
