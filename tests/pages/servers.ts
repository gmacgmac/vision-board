// Each worker's own board servers (helpers.ts `test`), on its ports (ports.ts), serving the page the
// global setup built (global-setup.ts):
// - main: a copy of the roadmap fixture ledger, with the example calculator app copied in from the
//   skill folder (the gallery's live app panel) and the gallery's pictures in its images folder
//   (gallery-images.ts); every test's `baseURL`.
// - perf: the performance fixture (`#format/testing` perfLedger), so the budgets never share a
//   ledger with the other tests (perf.spec.ts, layout-controls.spec.ts).
// - empty: an empty project, no seed: the page waits there for the first board drawn.
// They run in a child process (serve-boards.ts). Every spec file starts on fresh copies (`forFile`):
// no file sees what another wrote, so files run in any order, on any worker. The projects are named
// after their port, as a folder chip shows them, and are removed when the worker stops.
import { fork } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CHILD = fileURLToPath(new URL('./serve-boards.ts', import.meta.url));

export interface WorkerBoards {
  /** The worker's boards for this spec file: fresh copies when the file is a new one. */
  forFile(file: string): Promise<void>;
  close(): Promise<void>;
}

type Reply = { type: 'ready' } | { type: 'error'; message: string };

export function workerBoards(): WorkerBoards {
  const child: ChildProcess = fork(CHILD, { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let current = '';
  const ask = (type: 'reset') => new Promise<void>((resolve, reject) => {
    const exited = (code: number | null) => reject(new Error(`the board servers stopped (${code})`));
    child.once('exit', exited);
    child.once('message', (reply: Reply) => {
      child.off('exit', exited);
      if (reply.type === 'ready') resolve();
      else reject(new Error(`the board servers could not start: ${reply.message}`));
    });
    child.send({ type });
  });
  return {
    async forFile(file) {
      if (file === current) return;
      await ask('reset');
      current = file;
    },
    close: () => new Promise<void>((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.send({ type: 'close' });
    }),
  };
}
