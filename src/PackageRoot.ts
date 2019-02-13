import * as fs from 'fs';
import * as path from 'path';

export default function PackageRoot(
  startDir: string,
): string {
  let packageRoot = startDir;

  while (true) {
    try {
      fs.readFileSync(path.join(packageRoot, '.vxpackage'));
    } catch {
      const nextPackageRoot = path.join(packageRoot, '..');

      if (nextPackageRoot !== packageRoot) {
        packageRoot = nextPackageRoot;
        continue;
      }

      return startDir;
    }

    return packageRoot;
  }
}
