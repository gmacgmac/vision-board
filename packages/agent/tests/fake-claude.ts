// A stand-in for the `claude` CLI, so the adapter's tests never run the real one. It reads the
// prompt from stdin, notes what it was given in FAKE_CLAUDE_NOTE (argv, prompt, the gate's
// environment (route, token, wait; all of it in `gateEnv`), the MCP config it was pointed at, the folder it runs in), then acts by FAKE_CLAUDE_MODE:
//   replay (default)  print FAKE_CLAUDE_FIXTURE's lines and exit 0
//   new-in-use        as the CLI does for `--session-id` on a session that exists: refuse; else replay
//   hang              print the fixture's first line, then wait (SIGTERM ends it)
//   stubborn          as hang, but ignore SIGTERM (only SIGKILL ends it)
// Not a test itself (no .test.ts).
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const prompt = readFileSync(0, 'utf8');
const mode = process.env.FAKE_CLAUDE_MODE ?? 'replay';
const lines = readFileSync(process.env.FAKE_CLAUDE_FIXTURE!, 'utf8').split('\n').filter(Boolean);
const config = args[args.indexOf('--mcp-config') + 1]!;

if (process.env.FAKE_CLAUDE_NOTE) {
  const note = {
    args,
    prompt,
    gate: { url: process.env.AGENT_GATE_URL, token: process.env.AGENT_GATE_TOKEN },
    gateWaitMs: process.env.AGENT_GATE_WAIT_MS,
    /** Every AGENT_GATE_* variable, so a test can run the gate as this CLI would. */
    gateEnv: Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('AGENT_GATE_'))),
    mcpConfig: JSON.parse(readFileSync(config, 'utf8')),
    pid: process.pid,
    cwd: process.cwd(),
  };
  writeFileSync(process.env.FAKE_CLAUDE_NOTE, `${JSON.stringify(note)}\n`, { flag: 'a' });
}

if (mode === 'new-in-use' && args.includes('--session-id')) {
  process.stderr.write(`Error: Session ID ${args[args.indexOf('--session-id') + 1]} is already in use.\n`);
  process.exit(1);
}
if (mode === 'hang' || mode === 'stubborn') {
  if (mode === 'stubborn') process.on('SIGTERM', () => { /* ignored on purpose */ });
  process.stdout.write(`${lines[0]}\n`);
  setInterval(() => { /* keep running */ }, 60_000);
} else {
  process.stdout.write(lines.map((l) => `${l}\n`).join(''));
}
