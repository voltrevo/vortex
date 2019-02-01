import * as vortex from 'vortexlang';

import * as monaco from './monaco';
import renderApplication from './renderApplication';

export default function compileRender(
  files: { [filename: string]: string },
  filesStorage: { [filename: string]: any },
  currentFile: string,
  monacoModel: monaco.editor.ITextModel,
  domQuery: (query: string) => HTMLElement,
  stepLimit: number,
) {
  function readFile(f: string): string | Error {
    return files[f] || new Error('File not found');
  }

  const [rawNotes, az] = vortex.Compiler.compile(
    [currentFile],
    readFile,
    { stepLimit },
  );

  const outcomeEl = domQuery('#outcome');
  const stepsEl = domQuery('#steps');
  const stepLimitEl = domQuery('#stepLimit');
  const charsEl = domQuery('#chars');
  const notesEl = domQuery('#notes');
  const vasmEl = domQuery('#vasm');

  const mod = az.modules[currentFile];

  if (mod === undefined || mod.outcome === null) {
    outcomeEl.textContent = '';
  } else {
    outcomeEl.textContent = vortex.Outcome.LongString(mod.outcome);
  }

  stepsEl.textContent = `${az.steps}`;
  stepLimitEl.textContent = `${stepLimit}`;
  charsEl.textContent = `${files[currentFile].length}`;
  notesEl.innerHTML = '';

  for (const note of rawNotes) {
    if (
      note.tags.indexOf('file-outcome') !== -1 ||
      note.tags.indexOf('statistics') !== -1
    ) {
      continue;
    }

    let message = note.message;

    while (message.indexOf(`${currentFile}:`) !== -1) {
      message = message.replace(`${currentFile}:`, '');
    }

    const noteEl = document.createElement('div');
    noteEl.classList.add('note');
    noteEl.classList.add(note.level);

    noteEl.textContent = noteText(note, currentFile);

    notesEl.appendChild(noteEl);

    if (note.subnotes.length > 0) {
      const subnotesEl = document.createElement('div');
      subnotesEl.style.backgroundColor = '#1e1e1e';
      subnotesEl.style.padding = '0';

      for (const subnote of note.subnotes) {
        const subnoteEl = document.createElement('div');
        subnoteEl.classList.add('note');
        subnoteEl.classList.add(subnote.level);

        subnoteEl.textContent = noteText(subnote, currentFile);

        subnotesEl.appendChild(subnoteEl);
      }

      noteEl.appendChild(subnotesEl);
    }
  }

  const notes = vortex.Note.flatten(rawNotes);

  const markers: monaco.editor.IMarkerData[] = [];

  for (const note of notes) {
    const [file, range] = note.pos;

    // TODO: Include notes from other files and non-file notes
    if (file !== currentFile || range === null) {
      continue;
    }

    const startLineNumber = range[0][0];
    const startColumn = range[0][1];
    const endLineNumber = range[1][0];
    const endColumn = range[1][1] + 1;

    const severity = (() => {
      switch (note.level) {
        case 'info': return monaco.MarkerSeverity.Info;
        case 'warn': return monaco.MarkerSeverity.Warning;
        case 'error': return monaco.MarkerSeverity.Error;
      }
    })();

    const message = note.message;

    markers.push({
      severity,
      message,
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    });
  }

  monaco.editor.setModelMarkers(monacoModel, 'default', markers);

  // TODO: dedupe with vxc cli tool
  const modules = goodModules(az.pack);

  if (modules === null) {
    vasmEl.textContent = (
      'Can\'t emit assembly for package with errors'
    );

    vasmEl.classList.add('error');
  } else {
    const lines: string[] = [];

    for (const file of Object.keys(modules)) {
      const mod = modules[file];

      lines.push(
        `mfunc $${file} {`,
        ...vortex.ByteCoder.Block(
          vortex.ByteCoder(file),
          mod.program
        ).map(line => '  ' + line),
        `}`,
        ``,
      );
    }

    lines.push(`mcall ${currentFile} return`);

    vasmEl.textContent = lines.join('\n');
    vasmEl.classList.remove('error');
  }

  const appEl = domQuery('#application');
  const stateEl = domQuery('#state');

  filesStorage[currentFile] = filesStorage[currentFile] || {};

  renderApplication(
    az,
    mod && mod.outcome || null,
    appEl,
    stateEl,
    filesStorage[currentFile],
  );

  domQuery('#state-refresh').onclick = () => {
    filesStorage[currentFile] = {};
    
    renderApplication(
      az,
      mod && mod.outcome || null,
      appEl,
      stateEl,
      filesStorage[currentFile],
    );
  };
}

function goodModules(
  pack: vortex.Package,
): { [file: string]: vortex.Package.Module } | null {
  const res: { [file: string]: vortex.Package.Module } = {};

  for (const file of Object.keys(pack.modules)) {
    const entry = pack.modules[file];

    if (entry === undefined || entry.t === 'ParserNotes') {
      return null;
    }

    res[file] = entry;
  }

  return res;
}

function replaceAll(str: string, pattern: string, newPattern: string) {
  while (str.indexOf(pattern) !== -1) {
    str = str.replace(pattern, newPattern);
  }

  return str;
}

function noteText(note: vortex.Note, currentFile: string) {
  return replaceAll(
    `${vortex.formatLocation(note.pos)}: ${note.message}`,
    `${currentFile}:`,
    '',
  );
}
