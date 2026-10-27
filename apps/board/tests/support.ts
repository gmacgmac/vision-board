// The board's test support (`#board/testing`, D-060): what tests outside the app use to reach a real
// board (the page suite's servers, the fake CLIs a chat runs, an app or an image put in a project).
//
// Run directly, it is the fixture server other modules spawn, since a package may not import an app
// (D-016): the API harness (a real board on a free port over the roadmap fixture plus the seeded
// `pricing` board), its address printed on the first line, stopped when stdin closes or on SIGTERM.
// They find this file by its name, resolving `#board/testing` (import.meta.resolve), never by path.
import { fileURLToPath } from 'node:url';
import { startBoard } from './api-harness.ts';

export { DIST, joinAgent, personAct, personCookie, startTestBoard } from './test-board.ts';
export type { TestAgent, TestBoard, TestBoardOptions } from './test-board.ts';
export { startBoard } from './api-harness.ts';
export type { Harness } from './api-harness.ts';
export { addApp } from './app-support.ts';
export { ask, fakeChat, gone } from './chat-support.ts';
export { IMAGES, imagesDir, pngOf, put } from './images-support.ts';
export type { Rgb } from './images-support.ts';
export { seeded } from './random.ts';
export type { Random } from './random.ts';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const board = await startBoard();
  process.stdout.write(`${board.base}\n`);
  const stop = () => { void board.close().then(() => process.exit(0)); };
  process.on('SIGTERM', stop);
  process.stdin.on('end', stop);
  process.stdin.resume();
}
