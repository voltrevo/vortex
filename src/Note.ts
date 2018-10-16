// import assert from './assert';
import Syntax from './parser/Syntax';

type Note = {
  pos?: Syntax.Pos,
  level: 'error' | 'warn' | 'info';
  tags: Note.Tag[],
  message: string;
  subnotes?: Note[];
};

function Note(
  el: { p?: Syntax.Pos },
  level: 'error' | 'warn' | 'info',
  tags: Note.Tag[],
  message: string,
  subnotes?: Note[],
): Note {
  /* TODO: restore this
  const categories = [
    'syntax',
    'validation',
    'analyzer',
    'statistics',
    'package',
  ];

  const hasCategory = tags.some(t => categories.indexOf(t) !== -1);
  assert(hasCategory);
  */

  for (const tag of tags) {
    if (!Note.isTag(tag)) {
      throw new Error('Unlisted tag: ' + tag);
    }
  }

  return {
    ...(el.p ? { pos: el.p } : {}),
    level,
    tags: [level, ...tags],
    message,
    ...(subnotes ? { subnotes } : {}),
  };
}

namespace Note {
  export type FileNote = Note & { file: string };

  export function FileNote(
    file: string,
    el: { p?: Syntax.Pos },
    level: 'error' | 'warn' | 'info',
    tags: Note.Tag[],
    message: string,
    subnotes?: Note[],
  ): FileNote {
    const note = Note(el, level, tags, message, subnotes);
    return { ...note, file };
  }

  export function flatten(notes: Note[]): Note[] {
    const newNotes: Note[] = [];

    for (const note of notes) {
      newNotes.push(note);

      if (note.subnotes) {
        newNotes.push(...flatten(note.subnotes));
      }
    }

    return newNotes;
  }

  export type Tag = (
    'error' |
    'warn' |
    'info' |
    'analyzer' |
    'validation' |
    'package' |
    'invalid-import-source' |
    'import-loop' |
    'infinite-loop' |
    'no-effect' |
    'top-expression' |
    'control-flow' |
    'return-failure' |
    'empty-body' |
    'for-return' |
    'no-inner-return' |
    'control-clause-prevents-return' |
    'scope' |
    'not-found' |
    'incomplete-closure' |
    'transitive-closure' |
    'variable-disambiguation' |
    'unused' |
    'exception' |
    'not-implemented' |
    'assert-false' |
    'type-error' |
    'operator' |
    'subexpression-mutation' |
    'function-mutation' |
    'is-duplicated' |
    'duplicate' |
    'object' |
    'duplicate-key' |
    'duplicate-index' |
    'mutation' |
    'capture' |
    'capture-mutation' |
    'out-of-bounds' |
    'index-too-large' |
    'invalid-condition' |
    'for-condition' |
    'for-control' |
    'assert-non-bool' |
    'iteration-limit' |
    'assignment' |
    'statistics' |
    'compile-time' |
    'compiler' |
    'file-outcome' |
    'break-prevents-return' |
    'invalid-assignment-target' |
    'mutation-target' |
    'unreachable' |
    'inc-dec' |
    'syntax' |
    'internal' |
    'object-multiplication' |
    'object-addition' |
    'index-bad' |
    'subscript' |
    'call-non-function' |
    'arguments-length-mismatch' |
    'non-identifier-assignment-target' |
    'key-not-found' |
    'destructuring' |
    'destructuring-mismatch' |
    'length-mismatch' |
    'non-identifier-creation-target' |
    'non-bool-condition' |
    'if-condition' |
    'non-bool-switch-case' |
    'incomplete-switch' |
    'assert' |
    'object-subscript' |
    'unary-plus-minus' |
    'creation' |
    'comparison' |
    'function-comparison' |
    never
  );

  export const tags: Note.Tag[] = [
    'error',
    'warn',
    'info',
    'analyzer',
    'validation',
    'package',
    'invalid-import-source',
    'import-loop',
    'infinite-loop',
    'no-effect',
    'top-expression',
    'control-flow',
    'return-failure',
    'empty-body',
    'for-return',
    'no-inner-return',
    'control-clause-prevents-return',
    'scope',
    'not-found',
    'incomplete-closure',
    'transitive-closure',
    'variable-disambiguation',
    'unused',
    'exception',
    'not-implemented',
    'assert-false',
    'type-error',
    'operator',
    'subexpression-mutation',
    'function-mutation',
    'is-duplicated',
    'duplicate',
    'object',
    'duplicate-key',
    'duplicate-index',
    'mutation',
    'capture',
    'capture-mutation',
    'out-of-bounds',
    'index-too-large',
    'invalid-condition',
    'for-condition',
    'for-control',
    'assert-non-bool',
    'iteration-limit',
    'assignment',
    'statistics',
    'compile-time',
    'compiler',
    'file-outcome',
    'break-prevents-return',
    'invalid-assignment-target',
    'mutation-target',
    'unreachable',
    'inc-dec',
    'syntax',
    'internal',
    'object-multiplication',
    'object-addition',
    'index-bad',
    'subscript',
    'call-non-function',
    'arguments-length-mismatch',
    'non-identifier-assignment-target',
    'key-not-found',
    'destructuring',
    'destructuring-mismatch',
    'length-mismatch',
    'non-identifier-creation-target',
    'non-bool-condition',
    'if-condition',
    'non-bool-switch-case',
    'incomplete-switch',
    'assert',
    'object-subscript',
    'unary-plus-minus',
    'creation',
    'comparison',
    'function-comparison',
  ];

  export const isTag = memberTestFromArray<Tag>(tags);
}

function memberTestFromArray<K extends string>(
  items: K[]
): ((key: string) => key is K) {
  const dict: { [key: string]: true | undefined } = {};

  for (const item of items) {
    if (dict[item]) {
      throw new Error('duplicate item when generating test: ' + item);
    }

    dict[item] = true;
  }

  return (key => Boolean(dict[key])) as ((key: string) => key is K);
}

export default Note;
