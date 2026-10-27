// Before any worker starts: build the page once (`npm run build`, apps/board/dist), which every
// worker's servers then serve (servers.ts). A failed build stops the run.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export default function globalSetup(): void {
  execFileSync('npm', ['run', 'build'], { cwd: fileURLToPath(new URL('../..', import.meta.url)), stdio: 'inherit' });
}
