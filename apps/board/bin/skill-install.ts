// npm run skill:install [-- --add-mcp] (D-118): copy the skill into each installed client (Claude Code, Kiro CLI and
// IDE, Kiro Crew) and say whether each has the board's MCP server. `--add-mcp` adds the missing entries; it changes
// the person's client settings, so an agent asks first. Exit 0, or 1 on a stale skill, no installed client or a
// failure; 2 on bad usage. The lines are server/skill-install.ts `runSkillInstall`'s, as the board prints them at start.
import os from 'node:os';
import { runSkillInstall } from '../server/skill-install.ts';
import * as binWords from '../server/words/bin.ts';

const args = process.argv.slice(2);
if (args.some((a) => a !== '--add-mcp')) {
  console.error(binWords.skillInstallUsage);
  process.exit(2);
}
const { lines, code } = runSkillInstall({ home: os.homedir(), addMcp: args.includes('--add-mcp') });
for (const line of lines) console.log(line);
process.exit(code);
