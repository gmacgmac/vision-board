#!/usr/bin/env node
// The `vb` executable: npm run vb -- <command> [flags]. All the work is in packages/cli/src.
import { nodeIo, run } from '../src/index.ts';

process.exitCode = await run(process.argv.slice(2), nodeIo());
