import * as fs from 'fs';
import * as path from 'path';

export default function Reader(entryPath: string) {
  return (subPath: string) => {
    let text: string | null = null;

    try {
      text = (fs
        .readFileSync(path.join(path.dirname(entryPath), subPath) + '.vx')
        .toString()
      );
    } catch {
      text = null;
    }

    return text;
  };
}
