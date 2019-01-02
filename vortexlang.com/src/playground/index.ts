import * as vortex from 'vortex';
import * as monaco from './monaco';

const editorEl = <HTMLElement | null>document.querySelector('#editor');

if (editorEl === null) {
  throw new Error('trap');
}

const editor = monaco.editor.create(editorEl, {
  theme: 'vs-dark',
	value: 'return [\'Hello\', \' \', \'world!\']:reduce(++);',
});

console.log(vortex, editor);

(window as any).vortex = vortex;
(window as any).editor = editor;
