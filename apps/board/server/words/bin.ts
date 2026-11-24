// Words: bin. The board's command-line tools.
// Keys: vision-board.bin.<name>. Plain code: no imports but other words files and types.

// ---- validate.ts
export const lineSchema = (i: number, pointer: string, detail: string): string => `line ${i}: schema ${pointer}: ${detail}`;
export const cannotRead = (value: string): string => `cannot read: ${value}`;

// ---- plugin-types.ts (plugin.d.ts: a host's compiler reads the header; the build and a test print the rest)
export const typesHeader = `// The board plugin's types, made by \`npm run build:plugin\` from the code: do not edit.
// \`mount\` is the view's one export (view/board.js), \`createEngine\` the engine's (engine/engine.js); the rest is what
// they take and give. The view uses the DOM's types, the engine Node's (\`AbortSignal\`).
`;
export const declaredFunction = (doc: string, signature: string): string => `${doc}export declare ${signature};`;
export const seamBehind = (now: string, held: string, seam: number): string =>
  `the seam's types changed (hash ${now}, seam.ts holds ${held}). Decide: a change a host built against seam ${seam} would not survive `
  + `(a member removed or renamed, a type narrowed for what a host gives or widened for what it receives, a new required member, a changed meaning) `
  + `raises SEAM to ${seam + 1} too; an addition that leaves them working does not. Then set SEAM_TYPES in apps/board/plugin/seam.ts to the new hash.`;

// ---- ledgers-undo.ts
export const ledgersUndoUsage = 'Usage: npm run ledgers:undo -- <folder>   (moves .visionboard/main/ back to .visionboard/ when main is its only ledger and no board server holds it)';
export const ledgersUndone = (folder: string, oldLedger: string): string => `Done: the ledger of ${folder} is back at ${oldLedger}. Turn the ledgerFolders flag off before the board opens it again, or it moves into main/ once more.`;

// ---- reply.ts
export const replyUsage = 'Usage: node apps/board/bin/reply.ts <board> [--ledger <name>] [--json]   (VB_PROJECT = project folder, default the repo root; the ledger: --ledger, else the one the board had open there last, else main)';
export const noBoardInLedger = (board: string, ledgerFile: string): string => `No board "${board}" in ${ledgerFile}.`;

// ---- ledger-migrate.ts (D-103)
export const ledgerMigrateUsage = 'Usage: npm run ledger:migrate -- <folder> [--check | --undo]   (a project folder: each of its ledgers; or one ledger\'s folder. --check says what would change and writes nothing; --undo puts the newest backup back)';
export const noLedgerHere = (folder: string): string => `There is no ledger in ${folder}: name a project folder or a ledger's folder.`;
export const ledgerCurrent = (file: string): string => `${file}: already in the current format; nothing to do.`;
export const ledgerWouldChange = (file: string, changed: number, byFormat: string): string => `${file}: ${changed} line(s) would be upgraded (by format: ${byFormat}). Nothing was written.`;
export const ledgerMigrated = (file: string, changed: number, byFormat: string, backup: string): string => `${file}: ${changed} line(s) upgraded (by format: ${byFormat}). The ledger as it was is in ${backup}; npm run ledger:migrate -- <folder> --undo puts it back.`;
export const ledgerNewer = (file: string, lines: string): string => `${file}: line(s) ${lines} were written by a newer Vision Board. Nothing was written; update the board to migrate it.`;
export const ledgerStopped = (file: string, stops: string): string => `${file}: can't be migrated, and nothing was written: ${stops}`;
export const ledgerUndone = (file: string, backup: string): string => `${file}: put back from ${backup}. Opening it for editing migrates it again; use an older Vision Board to keep it as it is.`;

// ---- skill-install.ts (npm run skill:install, and the board at start: D-118)
export const skillStale = (files: string[]): string => `The skill is out of date (${files.join(', ')}): run npm run build:skill, then npm run skill:install again. Nothing was copied.`;
export const noClient = (folders: string[]): string => `No client is installed: none of ${folders.join(', ')} exists. Nothing was copied.`;
export const skillCopied = (client: string, dir: string): string => `${client}: copied the skill to ${dir}.`;
export const skillSkipped = (client: string, folder: string): string => `${client}: skipped, not installed (no ${folder}).`;
export const skillFailed = (client: string, why: string): string => `${client}: failed, ${why}`;
export const nextClaude = 'Claude Code: start a new chat; a chat keeps the skill list it started with.';
export const nextKiro = 'Kiro CLI and IDE: start a new chat for the skill; MCP changes load when mcp.json is saved.';
export const nextCrew = 'Kiro Crew: click Probe All.';
export const mcpPresent = (client: string, name: string, file: string): string => `${client}: the board's MCP server is set up, as "${name}" in ${file}.`;
export const mcpMissing = (client: string, setup: string): string => `${client}: the board's MCP server is not set up. To set it up: ${setup}`;
export const mcpUnreadable = (client: string, file: string, why: string): string => `${client}: could not read ${file} (${why}), so the MCP server was not checked.`;
export const setupClaude = (command: string): string => `run ${command}`;
export const setupKiro = (file: string, entry: string): string => `add "vision-board": ${entry} to "mcpServers" in ${file}.`;
export const askBeforeAddMcp = 'To add the missing entries, ask the person first: npm run skill:install -- --add-mcp changes their client settings.';
export const mcpAdded = (client: string, file: string): string => `${client}: added the board's MCP server as "vision-board" in ${file}.`;
export const mcpNameTaken = (client: string, file: string): string => `${client}: "vision-board" already names another server in ${file}; left as it is. Add the board's under another name by hand.`;
export const mcpAddFailed = (client: string, why: string): string => `${client}: could not add the board's MCP server: ${why}`;
export const claudeNotFound = 'the claude command was not found on PATH.';
export const claudeAddFailed = (code: number | null, output: string): string => `claude mcp add ended with ${code ?? 'a signal'}${output ? `: ${output}` : '.'}`;
export const skillInstallUsage = 'Usage: npm run skill:install [-- --add-mcp]   (copies the skill into each installed client and reports the MCP server; --add-mcp adds the missing entries, after the person says yes)';
export const clientNames = { claude: 'Claude Code', kiro: 'Kiro CLI and IDE', crew: 'Kiro Crew' } as const;
