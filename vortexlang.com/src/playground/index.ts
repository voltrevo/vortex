import * as vortex from 'vortexlang';
import * as monaco from './monaco';

monaco.languages.register({
  id: 'vortex',
});

monaco.languages.setMonarchTokensProvider('vortex', <any>{
  // Set defaultToken to invalid to see what you do not tokenize yet
  // defaultToken: 'invalid',

  keywords: [
    'continue', 'for', 'switch', 'assert', 'if', 'break', 'throw', 'else',
    'return', 'static', 'class', 'true', 'false', 'null', 'func', 'log',
    'import', 'from', 'of',
  ],

  typeKeywords: [
    'bool', 'u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'f8', 'f16',
    'f32', 'f64', 'string',
  ],

  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    '%=', '<<=', '>>=', '>>>=', '**', '**=', ':=',
  ],

  // we include these common regular expressions
  symbols:  /[=><!~?:&|+\-*\/\^%]+/,

  // C# style strings
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [/[a-z_$][\w$]*/, { cases: { '@typeKeywords': 'keyword',
                                   '@keywords': 'keyword',
                                   '@default': 'identifier' } }],

      // whitespace
      { include: '@whitespace' },

      // delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, { cases: { '@operators': 'operator',
                              '@default'  : '' } } ],

      // @ annotations.
      // As an example, we emit a debugging log message on these tokens.
      // Note: message are supressed during the first load -- change some lines to see them.
      [/@\s*[a-zA-Z_\$][\w\$]*/, { token: 'annotation', log: 'annotation token: $0' }],

      // numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // strings
      [/"([^'\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
      [/'/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],

      // characters
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string','string.escape','string']],
      [/'/, 'string.invalid']
    ],

    comment: [
      [/[^\/*]+/, 'comment' ],
      [/\/\*/,    'comment', '@push' ], // nested comment
      [/\*\//,    'comment', '@pop'  ],
      [/[\/*]/,   'comment' ]
    ],

    string: [
      [/[^\\']+/,  'string'],
      [/@escapes/, 'string.escape'],
      [/\\./,      'string.escape.invalid'],
      [/'/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/,       'comment', '@comment' ],
      [/\/\/.*$/,    'comment'],
    ],
  },
});

function notNull<T>(value: T | null): T {
  if (value === null) {
    throw new Error();
  }

  return value;
}

function blockTrim(text: string) {
  let lines = text.split('\n');

  while (lines.length > 0 && /^ *$/.test(lines[0])) {
    lines.shift();
  }

  while (lines.length > 0 && /^ *$/.test(lines[lines.length - 1])) {
    lines.pop();
  }

  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    let match = line.match(/^ */);

    if (match === null || match[0].length >= minIndent) {
      continue;
    }

    minIndent = match[0].length;
  }

  lines = lines.map(line => line.slice(minIndent));

  return lines.join('\n');
}

const editorEl = <HTMLElement>notNull(document.querySelector('#editor'));
const outputEl = notNull(document.querySelector('#output'));
const vasmEl = notNull(document.querySelector('#vasm'));

const selectEl = <HTMLSelectElement>notNull(document.querySelector('#file-location select'));
const filePreviousEl = notNull(document.querySelector('#file-previous'));
const fileNextEl = notNull(document.querySelector('#file-next'));

const files = {
  '@/tutorial/hello.vx': blockTrim(`
    // Welcome to the Vortex playground!
    //
    // This playground also acts as a tutorial by describing a variety of
    // examples. Please go ahead and make edits to the code, you should see
    // the results in real-time!
    //
    // Keeping with tradition, here is the hello world program:

    return 'Hello world!';

    // When you're ready, click the next arrow ('>') above to continue.
  `),
  '@/tutorial/empty.vx': blockTrim(`
    // An empty program is invalid because it doesn't return a value. You
    // should see a red underline at the end of the input. Hover over it with
    // your mouse to see details.
  `),
  '@/tutorial/variables/1.vx': blockTrim(`
    // Create variables with :=
    x := 0;

    // Mutate variables with =
    x = 1;

    // Increment, decrement, and compound assignment operators are also
    // available:
    x++;
    x--;
    x += 10;
    x *= 2;

    return x;
  `),
  '@/tutorial/variables/2.vx': blockTrim(`
    // It's an error to create a variable that already exists:

    x := 0;
    x := 0;
  `),
};

for (const filename of Object.keys(files)) {
  const option = document.createElement('option');
  option.textContent = filename;
  selectEl.appendChild(option);
}

let currentFile = '@/tutorial/hello.vx';

editorEl.innerHTML = '';

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
  value: files[currentFile],
	language: 'vortex',
});

window.addEventListener('resize', () => editor.layout());

const model = notNull(editor.getModel());

function onFileChange() {
  currentFile = selectEl.value;
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
    compile();
  }, 200) as any as number;
});

function compile() {
  function readFile(f: string): string | Error {
    return files[f] || new Error('File not found');
  }

  const [rawNotes, az] = vortex.Compiler.compile(
    [currentFile],
    readFile,
    { stepLimit: 100000 },
  );

  const mod = az.modules[currentFile];

  if (mod === undefined) {
    throw new Error('currentFile not found');
  }

  if (mod.outcome === null) {
    outputEl.textContent = '';
  } else {
    outputEl.textContent = vortex.Outcome.LongString(mod.outcome);
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

  monaco.editor.setModelMarkers(model, 'default', markers);

  // TODO: dedupe with vxc cli tool
  const modules = goodModules(az.pack);

  if (modules === null) {
    throw new Error('Can\'t emit bytecode for package that failed parsing');
  }

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
}

compile();

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
