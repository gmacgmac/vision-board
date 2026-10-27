// Words: writes. The refusals for a write: a board, node, key, grant or batch that does not fit.
// Keys: board.writes.<name>. Plain code: no imports but other words files and types.

// ---- edge.ts
export const boardHasNoCard = (board: string, String: string): string => `board ${board} has no card ${String}`;
export const theRequestNamesACard = (board: string): string => `The request names a card board "${board}" does not have. Name each card by its number on this board (get_board lists them).`;

// ---- reads.ts
export const thereIsNoNodeOn = (n: number, board: string): string => `There is no node ${n} on board "${board}". Call get_board to see its nodes.`;
export const thereIsNoRegionOn = (region: string, board: string): string => `There is no region "${region}" on board "${board}". Call get_board to see its regions.`;
export const containerOnBoardWasRetired = (region: string, board: string): string => `Container "${region}" on board "${board}" was retired, so nothing is arranged in it. Call get_board to see its regions.`;

// ---- writes.ts
export const theRequestDoesNotFit = 'The request does not fit the schema. Fix the fields listed in errors and send it again.';
export const thisNamesBoardButWas = (String: string, board: string): string => `this names board "${String}" but was sent to board "${board}"`;
export const keyReusedForDifferentContent = 'key reused for different content; use a new key for a new request';

// ---- visibility.ts
export const thereIsNoBoardCall = (id: string): string => `There is no board "${id}". Call list_boards to see the boards.`;
export const thereIsNoBoardCallList = (board: string): string => `There is no board "${board}". Call list_boards to see the boards, or start the batch with a board item to make it.`;
export const boardIsLockedSoNo = (board: string): string => `Board "${board}" is locked, so no chat can start on it. Unlock it from the "⋯" menu first.`;

// ---- write-board.ts
export const theBodyWouldBeOver = (body: number): string => `the body would be over ${body} characters`;
export const theKeyWasUsedBefore = (key: string): string => `The key "${key}" was used before for different content. Use a new key for new content, or resend the same content to get the first result.`;
export const keyReusedForDifferentContent2 = 'key reused for different content';
export const nodeIsAtVersion = (n: number, ver: number): string => `node ${n} is at version ${ver}`;
export const thisCallWritesBoardAnd = (board: string, n: number, board2: string): string => `This call writes board "${board}", and node ${n} is on board "${board2}". Send the item to that board's write_board.`;
export const nodeIsOnBoardNot = (n: number, board: string, board2: string): string => `node ${n} is on board "${board}", not "${board2}"`;
export const onlyThePersonCan = 'Only the person can';
export const onlyTheAgentThatCreated = (board: string): string => `Only the agent that created board "${board}" can`;
export const madeByThePerson = 'made by the person';
export const createdByAnotherAgent = 'created by another agent';
export const thePerson = 'the person';
export const anotherAgent = 'another agent';
export const youMayNotWriteOn = (board: string, maker: string): string => `You may not write on board "${board}" yet: ${maker} made it. Call request_grant once with just the board`;
export const youDoNotHoldThe = (region: string, board: string): string => `You do not hold the container "${region}" on board "${board}". Call request_grant once`;
export const waitForThePersonS = (what: string): string => `${what}, wait for the person's answer in check_responses, then resend the same items with the same keys.`;
export const proposeAsCheckAndAs = (word: string, old: string): string => `Propose ✓ as \`check\` and ✗ as \`cross\`: send action "${word}", not "${old}".`;
export const isNow = (old: string, word: string): string => `"${old}" is now "${word}"`;
export const eachItemNeedsAType = (itemTypes: string): string => `Each item needs a \`type\`, one of ${itemTypes}, and the fields of that type. Each type's form in the items schema of write_board has an example. Fix the fields listed in errors and send it again.`;
export const thisItemDoesNotFit = 'This item does not fit the write-item schema. Fix the fields listed in errors, as `example` shows for this type, and send it again.';

// ---- write-refs.ts
export const thisItemNamesTheKey = (key: string): string => `This item names the key "${key}", and the item with that key failed. Fix that item, then send both again with the same keys.`;
export const theItemWithKeyFailed = (key: string): string => `the item with key "${key}" failed`;
export const noNodeYouMadeHas = (key: string): string => `No node you made has the key "${key}". Name the node by its number, or by the key of the node item that made it.`;
export const noNodeYouMadeHasThe = (key: string): string => `no node you made has the key "${key}"`;

// ---- write-board.ts
export const changeItsTitleAndSummary = (person: string | number): string => `${person} change its title and summary. Leave the board item out and write your regions and nodes.`;
export const boardWas = (board: string | number, person: string | number): string => `board "${board}" was ${person}`;

// ---- writes.ts
export const theBatchHasItemsAnd = (count: number, most: number): string => `The batch has ${count} items and the limit is ${most}. Split the items across several calls.`;

// ---- visibility.ts
export const boardIsArchivedSoRestore = (board: string, what: string): string => `Board "${board}" is archived, so ${what}. Restore it from the board picker first.`;

// ---- write-board.ts
export const withThisTextNodeS = (numberOf: number, codePoints: number, body: number): string => `With this text, node ${numberOf}'s body would be ${codePoints} characters, and the limit is ${body}. Send less, or rewrite the node with a node item.`;
export const nodeIsAtVersionNot = (n: number, ver: number, base: number, ver2: number): string => `Node ${n} is at version ${ver}, not ${base}: it changed since you read it. Read it again with show_node, then send your change with base ${ver2}.`;
export const youCanProposeOnlyOn = (why: string): string => `You can propose only on a question, decision or action card: ${why}. Answer it with a reply instead.`;
export const youCanTRetireThis = (why: string): string => `You can't retire this yet: ${why}. Then send the retire again with the same key.`;

// ---- write-refs.ts
export const boardHasNoCardName = (board: string, String: string): string => `Board "${board}" has no card ${String}. Name a card by its number on this board (get_board lists them), or by the key of the node item that made it.`;
