import compile from './compile';

let stdinText = '';

process.stdin.on('data', chunk => {
  if (chunk !== null) {
    stdinText += chunk;
  }
});

process.stdin.on('end', () => {
  for (const note of compile(stdinText)) {
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
