import * as vortex from 'vortexlang';

export default function renderConsoleApplication(
  az: vortex.Analyzer,
  outcome: vortex.Outcome.ConcreteObject,
  contentEl: HTMLElement,
) {
  const displayEl = document.createElement('div');
  displayEl.style.padding = '1.5em';

  const inputBox = document.createElement('div');
  const inputEl = document.createElement('input');
  inputEl.setAttribute('type', 'text');
  const sendEl = document.createElement('div');
  sendEl.classList.add('button');
  inputBox.appendChild(inputEl);
  inputBox.appendChild(sendEl);

  contentEl.appendChild(displayEl);
  contentEl.appendChild(inputBox);

  inputBox.style.display = 'flex';
  inputEl.style.flexGrow = '1';
  sendEl.textContent = 'Send';
  sendEl.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';

  let oncleanup = () => {};

  let intervalId: number = setInterval(() => {
    if (contentEl.parentNode === null) {
      clearInterval(intervalId);
      oncleanup();
    }
  }, 100) as any as number;

  vortex.runConsoleApp(
    az,
    outcome,
    (text: string) => displayEl.textContent = text,
    () => new Promise((resolve) => {
      sendEl.onclick = () => {
        resolve(inputEl.value);
        inputEl.value = '';
      };

      inputEl.onkeydown = (evt) => {
        if (evt.key === 'Enter') {
          resolve(inputEl.value);
          inputEl.value = '';
        }
      }

      oncleanup = () => { resolve(null) };
    }),
  );
}
