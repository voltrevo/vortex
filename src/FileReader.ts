import * as fs from 'fs';
import * as path from 'path';

export default function FileReader(packageRoot: string) {
  const fileCache: { [file: string]: string | Error } = {};

  return function(file: string) {
    let text: string | Error | null = null;

    if (file.slice(0, 2) !== '@/') {
      throw new Error('Expected a local read: ' + file);
    }

    if (file in fileCache) {
      return fileCache[file];
    }

    try {
      text = fs.readFileSync(path.join(packageRoot, file.slice(2))).toString();
    } catch {}

    if (text === null) {
      text = new Error('not found');
    }

    fileCache[file] = text;

    return text;
  }
}
