// Every scenario, in the order the eval runs them: the plugin's (`SCENARIOS`) and the standalone bot's (`STANDALONE`,
// `--standalone`). Add one here to run it; a check is never loosened to pass.
import type { Scenario } from '../types.ts';
import { answeredNote } from './answered-note.ts';
import { draw } from './draw.ts';
import { insertStep } from './insert-step.ts';
import { joinLedger } from './join-ledger.ts';
import { ledgerPicture } from './ledger-picture.ts';
import { newCardNumber } from './new-card-number.ts';
import { otherLedger } from './other-ledger.ts';
import { ownBoard } from './own-board.ts';
import { picture } from './picture.ts';
import { readOnly } from './read-only.ts';
import { refusals } from './refusals.ts';
import { sendRound } from './send-round.ts';
import { summaryCard } from './summary-card.ts';
import { twoTurns } from './two-turns.ts';
import { wait } from './wait.ts';
import { whereCardsStand } from './where-cards-stand.ts';

export const SCENARIOS: readonly Scenario[] = [
  draw, sendRound, picture, refusals, wait, answeredNote, ownBoard, twoTurns, readOnly,
  whereCardsStand, newCardNumber, insertStep, summaryCard,
];
export const STANDALONE: readonly Scenario[] = [ledgerPicture, otherLedger, joinLedger];

export const scenarioById = (id: string): Scenario => {
  const all = [...SCENARIOS, ...STANDALONE];
  const found = all.find((s) => s.id === id);
  if (!found) throw new Error(`no scenario "${id}" (have: ${all.map((s) => s.id).join(', ')})`);
  return found;
};
