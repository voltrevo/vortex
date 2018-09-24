import { Syntax, parse } from './parser/parse';
import { validate } from './validation/validate';

let stdinText = '';

process.stdin.on('data', chunk => {
  if (chunk !== null) {
    stdinText += chunk;
  }
});

process.stdin.on('end', () => {
  let program: null | Syntax.Program = null;
  try {
    program = parse(stdinText);
  } catch (e) {
    if (e.hash) {
      console.error(JSON.stringify({
        lnum: e.hash.loc.first_line,
        end_lnum: e.hash.loc.last_line,
        col: e.hash.loc.first_column,
        end_col: e.hash.loc.last_column,
        text: e.message.split('\n')[3],
        type: 'error',
      }));
    } else {
      console.error(JSON.stringify({
        lnum: 1,
        end_lnum: 1,
        col: 1,
        end_col: 1,
        text: e.message,
        type: 'error',
      }));
    }
  }

  if (program) {
    for (const note of validate(program)) {
      console.error(JSON.stringify({
        lnum: note.pos.first_line,
        end_lnum: note.pos.last_line,
        col: note.pos.first_column,
        end_col: note.pos.last_column,
        text: note.message,
        type: note.level,
      }));
    }
  }
});
