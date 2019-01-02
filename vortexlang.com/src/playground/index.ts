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

const editorEl = <HTMLElement | null>document.querySelector('#editor');

if (editorEl === null) {
  throw new Error();
}

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
	value: 'return [\'Hello\', \' \', \'world!\']:reduce(++);',
	language: 'vortex',
});

const maybeModel = editor.getModel();

if (maybeModel === null) {
  throw new Error();
}

const model = maybeModel;

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
      uri: 'monaco://default',
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

  const notes = (vortex
    .Note
    .flatten(
      vortex.Compiler.compile(paths, readFile, { stepLimit: 100000 })[0]
    )
  );

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
}

console.log(vortex, editor);

(window as any).vortex = vortex;
(window as any).editor = editor;
(window as any).monaco = monaco;
