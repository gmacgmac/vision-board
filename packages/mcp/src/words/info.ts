// Words: info. What the server says about itself and how to use it.
// Keys: board.info.<name>. Plain code: no imports but other words files and types.

// ---- info.ts
export const visionBoard = 'Vision Board';
export const visionBoardIsABoard = 'Vision Board is a board you draw your output on, so the person can answer it card by card. Every card takes a note or Later; draw a `question`, `decision` or `action` card when you need the person\'s ✓ or ✗, which mean what your card asks.';
export const writeWithWriteBoardAnd = 'Write with `write_board` and give every item a `key`, so a retry never writes twice.';
export const toDrawOnABoard = 'To draw on a board another agent made, call `request_grant` with just its `board` first. When an item fails with `needs-grant`, call `request_grant` once for what it names (the board, or the board and region) and wait for the answer.';
export const thenCallCheckResponsesWith = 'Then call `check_responses` with the `head` you last saw (and `wait` up to 60 seconds) to read what the person did, sorted by card number (✓ reads `check`, ✗ reads `cross`), and resend failed items with the same keys. Answer every note with a `reply` or an `append`, and every Later with a `park`. A note never answers a card, and your answer to it clears the card\'s ✓ or ✗, so ask again when you still need one.';
export const joinAndListBoardsName = '`join` and `list_boards` name the folder the board has open (`project`) and, with ledger folders, the ledger open in it (`ledger`): check they are the ones you mean. If a call answers `wrong-folder`, the board has another folder or ledger open: stop, tell the person what it says, and do not call `join`.';
export const aBoardMarkedLockedList = 'A board marked `locked` (`list_boards`, `get_board`) can\'t be changed until the person unlocks it: every write on it answers `locked`, so tell the person in one line and stop. A read marked `readOnly` says the same of the whole ledger until the person makes it editable: every write answers `read-only` and writes nothing.';
export const callJoinOnceAndSave = 'Call `join` once and save your agent id and secret in your durable notes now, because a context compaction loses them; pass the secret as `secret` on later calls.';
export const youAlreadyHaveAnIdentity = 'You already have an identity on the board, set for you: do not call `join`, and leave `secret` out of every call.';
