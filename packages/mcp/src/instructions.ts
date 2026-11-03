// The instructions an agent reads before its first call (api.md 45; `initialize`, `server/discover`): standalone's, for
// an agent that joins, and for one whose identity is set for it. Their own file, words only, so the board engine can
// make a host's bot's from them (apps/board/server/words/plugin-tools.ts) without taking this server's paths along.
import * as infoWords from './words/info.ts';

const ABOUT = infoWords.visionBoardIsABoard;
const REST = [
  infoWords.writeWithWriteBoardAnd,
  infoWords.toDrawOnABoard,
  infoWords.thenCallCheckResponsesWith,
  infoWords.joinAndListBoardsName,
  infoWords.aBoardMarkedLockedList,
];

export const INSTRUCTIONS = [
  ABOUT,
  infoWords.callJoinOnceAndSave,
  ...REST,
].join(' ');

/** When VB_AGENT_SECRET is set (a chat the board started): the identity is given, so nothing to save. */
export const INSTRUCTIONS_JOINED = [
  ABOUT,
  infoWords.youAlreadyHaveAnIdentity,
  ...REST,
].join(' ');
