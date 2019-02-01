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

let currentFile = '';
const filesStorage: { [file: string]: any } = {};

editorEl.innerHTML = '';

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
  value: '',
  language: 'vortex',
});

setTimeout(() => changeFile(location.hash.slice(1)));

window.addEventListener('hashchange', () => {
  changeFile(location.hash.slice(1));
});

window.addEventListener('resize', () => editor.layout());

const model = notNull(editor.getModel());

model.updateOptions({ tabSize: 2, insertSpaces: true });

function changeFile(newFile: string) {
  if (currentFile === '') {
    currentFile = Object.keys(files)[0];
  } else if (newFile === currentFile) {
    return;
  }

  let fileIdx = Object.keys(files).indexOf(newFile);

  if (fileIdx !== -1) {
    currentFile = newFile;
  }

  fileIdx = Object.keys(files).indexOf(currentFile);
  location.hash = currentFile;
  selectEl.selectedIndex = fileIdx;
  model.setValue(files[currentFile]);
}

selectEl.addEventListener('change', () => {
  changeFile(selectEl.value);
});

const moveFileIndex = (change: number) => () => {
  const filenames = Object.keys(files);
  let idx = filenames.indexOf(currentFile);

  if (idx === -1) {
    throw new Error('This should not happen');
  }

  idx += change;
  idx = Math.max(idx, 0);
  idx = Math.min(idx, filenames.length - 1);

  changeFile(filenames[idx]);
};

filePreviousEl.addEventListener('click', moveFileIndex(-1));
fileNextEl.addEventListener('click', moveFileIndex(1));

let timerId: undefined | number = undefined;

let stepLimit = 100000;

domQuery('#steps-inc').onclick = () => {
  const sz = 10 ** Math.floor(Math.log10(stepLimit) + 0.001);
  let leader = Math.floor(stepLimit / sz);

  leader *= 2;

  if (leader === 4) {
    leader = 5;
  }

  stepLimit = leader * sz;
  updateCompileRender();
};

domQuery('#steps-dec').onclick = () => {
  const sz = 10 ** Math.floor(Math.log10(stepLimit) + 0.001);
  let leader = Math.floor(stepLimit / sz);

  leader /= 2;

  if (Math.floor(leader) === 2) {
    leader = 2;
  }

  stepLimit = leader * sz;
  updateCompileRender();
};

function updateCompileRender() {
  compileRender(files, filesStorage, currentFile, model, domQuery, stepLimit);
}

model.onDidChangeContent(() => {
  files[currentFile] = model.getValue();
  clearTimeout(timerId);

  timerId = setTimeout(updateCompileRender, 200) as any as number;
});
