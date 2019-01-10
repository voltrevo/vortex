import * as vortex from 'vortexlang';

import notNull from './notNull';
import renderConsoleApplication from './renderConsoleApplication';

export default function renderApplication(
  az: vortex.Analyzer,
  outcome: vortex.Outcome | null,
  appEl: HTMLElement,
) {
  appEl.className = '';

  let contentEl = <HTMLElement>notNull(appEl.querySelector('.content'));
  contentEl.outerHTML = '<div class="content"></div>';
  contentEl = <HTMLElement>notNull(appEl.querySelector('.content'));

  if (
    outcome === null ||
    outcome.cat !== 'concrete' ||
    outcome.t !== 'Object' ||
    !('type' in outcome.v)
  ) {
    return;
  }

  const type = outcome.v.type;

  if (type.t !== 'String') {
    return;
  }

  if (type.v === 'application.console') {
    appEl.classList.add('active');
    renderConsoleApplication(az, outcome, contentEl);
  }
}
