import * as monaco from './monaco';

import compileRender from './compileRender';
import files from './files';
import notNull from './notNull';

function domQuery<T = HTMLElement>(query: string): T {
  return <T><unknown>notNull(document.querySelector(query));
}

const editorEl = domQuery('#editor');

const selectEl = domQuery<HTMLSelectElement>('#file-location select');
const filePreviousEl = domQuery('#file-previous');
const fileNextEl = domQuery('#file-next');

for (const filename of Object.keys(files)) {
  const option = document.createElement('option');
  option.textContent = filename;
  selectEl.appendChild(option);
}

let currentFile = location.hash.slice(1);

if (Object.keys(files).indexOf(currentFile) === -1) {
  currentFile = Object.keys(files)[0];
  location.hash = currentFile;
}

window.addEventListener('hashchange', () => {
  const hashFile = location.hash.slice(1);

  if (hashFile === currentFile) {
    return;
  }

  if (Object.keys(files).indexOf(hashFile) === -1) {
    location.hash = currentFile;
    return;
  }

  currentFile = hashFile;
  onFileChange();
});

editorEl.innerHTML = '';

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
  value: files[currentFile],
  language: 'vortex',
});

window.addEventListener('resize', () => editor.layout());

const model = notNull(editor.getModel());

model.updateOptions({ tabSize: 2, insertSpaces: true });

function onFileChange() {
  currentFile = selectEl.value;
  location.hash = currentFile;
  model.setValue(files[currentFile]);
}

selectEl.addEventListener('change', onFileChange);

const moveFileIndex = (change: number) => () => {
  const filenames = Object.keys(files);
  let idx = filenames.indexOf(currentFile);

  if (idx === -1) {
    throw new Error('This should not happen');
  }

  idx += change;
  idx = Math.max(idx, 0);
  idx = Math.min(idx, filenames.length - 1);

  selectEl.selectedIndex = idx;
  onFileChange();
};

filePreviousEl.addEventListener('click', moveFileIndex(-1));
fileNextEl.addEventListener('click', moveFileIndex(1));

let timerId: undefined | number = undefined;

model.onDidChangeContent(() => {
  files[currentFile] = model.getValue();
  clearTimeout(timerId);

  timerId = setTimeout(() => {
    compileRender(files, currentFile, model, domQuery);
  }, 200) as any as number;
});

compileRender(files, currentFile, model, domQuery);
