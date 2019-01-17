import * as vortex from 'vortexlang';

import notNull from './notNull';

function FrameEventManager() {
  let handler: (() => void) | null = null;
  let requested = false;

  return {
    setHandler: function(h: (() => void) | null) {
      handler = h;

      if (handler !== null && !requested) {
        window.requestAnimationFrame(function request() {
          if (handler !== null) {
            handler();
            window.requestAnimationFrame(request);
            requested = true;
          } else {
            requested = false;
          }
        });

        requested = true;
      }
    }
  };
};

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

  const frameEventManager = FrameEventManager();
  cleanupJobs.push(() => frameEventManager.setHandler(null));

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

    const {events, objects} = renderData.v;

    if (
      events === undefined || events.t !== 'Array' ||
      objects === undefined || objects.t !== 'Array'
    ) {
      console.error('Expected events and objects arrays');
      return;
    }

    canvasEl.onclick = null;
    frameEventManager.setHandler(null);

    for (const evt of events.v) {
      if (evt.t !== 'String') {
        console.error('Non-string event', evt);
      }

      switch (evt.v) {
        case 'frame': {
          frameEventManager.setHandler(() => {
            applyAction(vortex.Outcome.Array([
              vortex.Outcome.String('frame'),
              vortex.Outcome.Object({
                time: vortex.Outcome.Number((Date.now() - startTime) / 1000),
              }),
            ]));
          });

          break;
        }

        case 'click': {
          canvasEl.onclick = ({clientX, clientY}) => {
            if (!alive) {
              return;
            }

            const {x, y} = <DOMRect>canvasEl.getBoundingClientRect();

            applyAction(vortex.Outcome.Array([
              vortex.Outcome.String('click'),
              vortex.Outcome.Array([
                vortex.Outcome.Number((clientX - x) / width),
                vortex.Outcome.Number((clientY - y) / width),
              ]),
            ]));
          };

          break;
        }

        default: console.error('Unrecognized event', evt);
      }
    }

    ctx2d.clearRect(0, 0, width, width);

    for (const obj of objects.v) {
      if (obj.cat !== 'concrete' || obj.t !== 'Array' || obj.v.length !== 2) {
        console.error('Invalid canvas object', obj);
        continue;
      }

      const [type, data] = obj.v;

      if (type.t !== 'String' || data.t !== 'Object') {
        console.error('Invalid canvas object', obj);
        continue;
      }

      if (type.v === 'polygon') {
        if (data.t !== 'Object') {
          console.error('Invalid canvas object', obj);
          continue;
        }

        const {points, style} = data.v;

        if (
          points === undefined || points.t !== 'Array' ||
          style === undefined || style.t !== 'Object'
        ) {
          console.error('Invalid canvas object', obj);
          continue;
        }

        ctx2d.beginPath();

        for (const p of points.v) {
          if (p.t !== 'Array' || p.v.length !== 2) {
            console.error('Invalid point', p, 'in', obj);
            continue;
          }

          const [x, y] = p.v;

          if (x.t !== 'Number' || y.t !== 'Number') {
            console.error('Invalid point', p, 'in', obj);
            continue;
          }

          ctx2d.lineTo(x.v * width, y.v * width);
        }

        ctx2d.closePath();

        const {fill, stroke} = style.v;

        if (fill !== undefined) {
          if (fill.t !== 'String') {
            console.error('Invalid fill', obj);
            continue;
          }

          ctx2d.fillStyle = fill.v;
          ctx2d.fill();
        }

        if (stroke !== undefined) {
          if (stroke.t !== 'Object') {
            console.error('Invalid stroke', obj);
            continue;
          }

          const {color, lineWidth} = stroke.v;

          if (color === undefined || color.t !== 'String') {
            console.error('Invalid stroke color', obj);
            continue;
          }

          ctx2d.strokeStyle = color.v;

          if (lineWidth !== undefined) {
            if (lineWidth.t !== 'Number') {
              console.error('Invalid lineWidth', obj);
              continue;
            }

            ctx2d.lineWidth = lineWidth.v;
          } else {
            ctx2d.lineWidth = 1;
          }

          ctx2d.stroke();
        }
      } else if (type.v === 'text') {
        const {content, width: twidth, height: theight, transform, color} = data.v;

        if (
          content === undefined || content.t !== 'String' ||
          color === undefined || color.t !== 'String' ||
          twidth === undefined || twidth.t !== 'Number' ||
          theight === undefined || theight.t !== 'Number' ||
          transform === undefined || transform.t !== 'Object'
        ) {
          console.error('Invalid canvas object', obj);
          continue;
        }

        ctx2d.font = '12px monospace';
        ctx2d.textBaseline = 'top';
        const textDims = ctx2d.measureText(content.v);
        const textDimsHeight = 12;

        const squashX = twidth.v / textDims.width;
        const squashY = theight.v / textDimsHeight;

        const squash = Math.min(squashX, squashY);
        ctx2d.font = `${12 * squash * width}px monospace`;

        const textWidth = squash * textDims.width;
        const textHeight = squash * textDimsHeight;

        ctx2d.fillStyle = color.v;

        try {
          const t: any = transform;

          ctx2d.setTransform(
            t.v.world.v[0].v[0].v,
            t.v.world.v[1].v[0].v,
            t.v.world.v[0].v[1].v,
            t.v.world.v[1].v[1].v,
            width * t.v.offset.v[0].v[0].v,
            width * t.v.offset.v[1].v[0].v,
          );
        } catch (err) {
          console.error('Error while setting transform', obj);
          continue;
        }

        ctx2d.fillText(
          content.v,
          width * 0.5 * (twidth.v - textWidth),
          width * 0.5 * (theight.v - textHeight),
        );

        ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        console.error('Invalid canvas object', obj);
      }
    }
  }

  updateSize();
}
