import compile from './compile';

let stdinText = '';

process.stdin.on('data', chunk => {
  if (chunk !== null) {
    stdinText += chunk;
  }
});

process.stdin.on('end', () => {
  const notes = compile(stdinText);

  // vim is silly and shows last note of line instead of first one... reversing
  // fixes this issue (vim takes care of (hopefully stable) reordering by line
  // number)
  notes.reverse();

  for (const note of notes) {
    console.error(JSON.stringify({
      lnum: note.pos.first_line,
      end_lnum: note.pos.last_line,
      col: note.pos.first_column,
      end_col: note.pos.last_column,
      text: note.message,
      type: note.level[0].toUpperCase(),
    }));
  }
});
