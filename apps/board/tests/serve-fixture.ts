// Test support for other packages that round-trip against a real server (packages/cli/tests):
// starts the API harness (a real board server on a free port over a seeded temporary project),
// prints its address on the first line, and stops when stdin closes or on SIGTERM. Not a test
// itself: the test runner only picks up *.test.ts.
import { startBoard } from './api-harness.ts';

const board = await startBoard();
process.stdout.write(`${board.base}\n`);

const stop = () => { void board.close().then(() => process.exit(0)); };
process.on('SIGTERM', stop);
process.stdin.on('end', stop);
process.stdin.resume();
