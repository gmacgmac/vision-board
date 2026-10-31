// Words: plugin-tools. How a tool's description reads to a bot that a host names (engine/tools.ts): the tool table's
// words (openapi.json, D-056) are written for the standalone bot, which joins, holds a secret and has the app
// host; a plugin bot does none of these, so these edits take them out. The standalone bot is told the table's
// words as they are. Each edit's `from` must occur once in its tool's description (a test holds it).
// Keys: board.plugin-tools.<name>. Plain code: no imports.
export interface DescriptionEdit { tool: string; from: string; to: string }

export const descriptionEdits: readonly DescriptionEdit[] = [
  { tool: 'list_open', from: 'With your secret, only the containers you hold,', to: 'Only the containers you hold,' },
  { tool: 'check_responses', from: 'With your secret, only the containers you hold.', to: 'Only the containers you hold.' },
  { tool: 'write_board', from: '(`app: { id }`, from `list_apps`)', to: '(`app: { id }`), already in the folder; you cannot list apps here, so draw one only when the person names its id' },
];
