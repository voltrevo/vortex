import * as vortex from 'vortex';
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

const editorEl = <HTMLElement>notNull(document.querySelector('#editor'));
const displayEl = notNull(document.querySelector('#display'));

editorEl.innerHTML = '';

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
  value: [
    `func intro() => spaceJoin(['Welcome', 'to', 'the', 'vortex', 'playground']);`,
    ``,
    `func sums() {`,
    `  func sumSimple() => (`,
    `    'A simple sum: ' ++`,
    `    [1, 2, 3, 4]:reduce(+):String()`,
    `  );`,
    ``,
    `  func sumLoop() {`,
    `    sum := 0;`,
    ``,
    `    for (i := 1; i <= 4; i++) {`,
    `      sum += i;`,
    `    }`,
    ``,
    `    return 'You can also use a loop: ' ++ sum:String();`,
    `  };`,
    ``,
    `  return [[sumSimple()], [sumLoop()]];`,
    `};`,
    ``,
    `captureMe := 3;`,
    ``,
    `func getCapture() {`,
    `  return captureMe:String() ++ ' was referenced by capture';`,
    `};`,
    ``,
    `func mutate() {`,
    `  x := 0;`,
    `  x++;`,
    ``,
    `  // This fails, try it!`,
    `  // captureMe++;`,
    ``,
    `  return 'Non-captured variables can be mutated: ' ++ x:String();`,
    `};`,
    ``,
    `func vectorAddition() {`,
    `  return [`,
    `    'Add apples to apples and oranges to oranges:',`,
    `    (`,
    `      {apples: 3, oranges: 1} +`,
    `      {apples: 5, oranges: 2}`,
    `    ),`,
    `  ];`,
    `};`,
    ``,
    `func matrixMultiplication() {`,
    `  mat := [[1, 2], [3, 4]];`,
    `  return 'And even do matrix multiplication: ' ++ (mat * mat):String();`,
    `};`,
    ``,
    `func valueSemantics() {`,
    `  x := [0, 0, 0];`,
    `  y := x;`,
    ``,
    `  msg := 'y is unaffected when x is mutated';`,
    `  x[1u64] += 123;`,
    ``,
    `  return {msg, x, y};`,
    `};`,
    ``,
    `func factorial(n) {`,
    `  if (n <= 0) {`,
    `    return 1;`,
    `  }`,
    ``,
    `  return n * factorial(n - 1);`,
    `};`,
    ``,
    `log.info [`,
    `  intro,`,
    `  sums,`,
    `  getCapture,`,
    `  mutate,`,
    `  vectorAddition,`,
    `  matrixMultiplication,`,
    `  valueSemantics,`,
    `  func() => '5! is ' ++ factorial(5):String(),`,
    `]:map(func(f) => f());`,
    ``,
    `func spaceJoin(values) => values:reduce(func(acc, v) => acc ++ ' ' ++ v);`,
    ``,
    `return 'done';`,
  ].join('\n'),
	language: 'vortex',
});

window.addEventListener('resize', () => editor.layout());

const model = notNull(editor.getModel());

let timerId: undefined | number = undefined;

model.onDidChangeContent(() => {
  clearTimeout(timerId);

  timerId = setTimeout(() => {
    compile();
  }, 200) as any as number;
});

function compile() {
  const docs = [
    {
      uri: 'monaco:///playground.vx',
      text: model.getValue(),
    },
  ];

  const firstDoc = docs[0];

  const baseMatch = firstDoc.uri.match(/^[^\/]*\/\/[^/]*/);

  if (baseMatch === null) {
    throw new Error('Shouldn\'t be possible');
  }

  const base = baseMatch[0];

  const paths = docs.map(doc => doc.uri.replace(base, '@'));

  function readFile(f: string): string | Error {
    const uri = f.replace('@', base);
    const doc = docs.find(d => d.uri === uri);

    if (!doc) {
      return new Error('Document not open: ' + uri);
    }

    return doc.text;
  }

  const [rawNotes, az] = vortex.Compiler.compile(
    paths,
    readFile,
    { stepLimit: 100000 },
  );

  const notes = vortex.Note.flatten(rawNotes);

  const markers: monaco.editor.IMarkerData[] = [];

  for (const note of notes) {
    const [, range] = note.pos;

    if (range === null) {
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

  lines.push(`mcall $@/playground.vx return`);

  displayEl.textContent = lines.join('\n');
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
