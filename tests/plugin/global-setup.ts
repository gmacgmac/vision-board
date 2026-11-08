// Before any worker starts: `npm run build:plugin`, so the contract test always mounts the folder as it is built
// now. A failed build stops the run; a folder still missing after it says so.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default function globalSetup(): void {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  execFileSync('npm', ['run', 'build:plugin'], { cwd: root, stdio: 'inherit' });
  if (!existsSync(`${root}dist/plugin/vision-board/manifest.json`)) throw new Error('dist/plugin/vision-board/ is missing: `npm run build:plugin` wrote no folder');
}
