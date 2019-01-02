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
  throw new Error('trap');
}

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
	value: 'return [\'Hello\', \' \', \'world!\']:reduce(++);',
	language: 'vortex',
});

console.log(vortex, editor);

(window as any).vortex = vortex;
(window as any).editor = editor;
(window as any).monaco = monaco;
