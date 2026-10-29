// Words: agent-access. Why the agent's access rules allow, ask or refuse a file or a command: what the
// agent reads when it is refused, and what each row of the rules means.
// Keys: board.agent-access.<name>. Plain code: no imports but other words files and types.

// ---- access-rules.ts (each row's why; a refused call tells the agent its row's)
export const filesInTheFolder = 'Files in the board\'s folder are read freely; a change is asked.';
export const filesOutsideTheFolder = 'Files outside the board\'s folder are asked each time.';
export const secretsFiles = 'Secrets files (.env, .envrc, .npmrc) are not open to the agent. Ask the person for the value you need.';
export const secretsExample = 'An example secrets file (.env.example) holds no secret: it is read freely; a change is asked.';
export const boardSecrets = 'The board keeps its agents\' keys and chat sessions private. Use the board\'s tools instead.';
export const theLedger = 'The ledger is written only through the board\'s tools.';
export const permissionsFile = 'Permissions are changed only by the person, in the chat.';
export const boardFiles = 'The board\'s own files are written only by the board. Use the board\'s tools instead.';
export const boardPicturesAndApps = 'Pictures and apps for the board are written freely.';
export const gitFolder = 'Git is the person\'s: the agent does not read or change .git. Ask the person for what you need from it.';
export const appState = 'What apps save on the board is the person\'s and the app\'s: not open to the agent.';

// ---- approvals.ts
export const refusedByTheRules = 'Refused: the board\'s access rules do not allow it, whatever the answer. Do not retry it, and do not work around it.';

// ---- policy.ts
export const noFolder = 'The board\'s folder could not be found, so nothing was done.';
export const noPath = 'The tool call named no file, so it was refused.';
export const gitIsThePersons = 'Git is the person\'s: the agent does not run git commands. Tell the person what you would run, and why.';
export const cannotFollow = 'The path could not be followed to a file, so it was refused.';
export const commandNames = (word: string, why: string): string => `The command names ${word}. ${why}`;
export const searchReaches = (where: string, file: string): string =>
  `Searching ${where} would read ${file}, which the agent may not read. Search a subfolder, or name the files.`;
