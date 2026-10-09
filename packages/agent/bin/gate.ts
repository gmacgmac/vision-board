#!/usr/bin/env node
// The gate hook's executable: the CLI runs it before a file edit or a shell command, with the
// tool call on stdin. It prints the decision on stdout and exits 0; the adapter's hook command adds
// `|| exit 2`, so a gate that fails to start still blocks the tool (src/gate.ts).
import { existsSync, readFileSync } from 'node:fs';
import { runGate } from '../src/index.ts';

const output = await runGate(readFileSync(0, 'utf8'), process.env, existsSync);
process.stdout.write(`${JSON.stringify(output)}\n`);
