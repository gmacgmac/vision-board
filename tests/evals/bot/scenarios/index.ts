// Every scenario, in the order the eval runs them: the plugin's (`SCENARIOS`) and the standalone bot's (`STANDALONE`,
// `--standalone`). Add one here to run it; a check is never loosened to pass. The timeline's three and export-import's
// two run in both: their scripts join only where `join` is given (timeline-checks.ts `secretArg`).
import type { Scenario } from '../types.ts';
import { answeredNote } from './answered-note.ts';
import { appBuild } from './app-build.ts';
import { copyBoard } from './copy-board.ts';
import { architectureIcons } from './architecture-icons.ts';
import { directionDefault } from './direction-default.ts';
import { draw } from './draw.ts';
import { findingsGrid } from './findings-grid.ts';
import { flowBranches } from './flow-branches.ts';
import { handoverPark } from './handover-park.ts';
import { importFile } from './import-file.ts';
import { insertStep } from './insert-step.ts';
import { joinLedger } from './join-ledger.ts';
import { lanesHandoffs } from './lanes-handoffs.ts';
import { ledgerPicture } from './ledger-picture.ts';
import { linkedPipeline } from './linked-pipeline.ts';
import { newCardNumber } from './new-card-number.ts';
import { otherLedger } from './other-ledger.ts';
import { ownBoard } from './own-board.ts';
import { personBoard } from './person-board.ts';
import { picture } from './picture.ts';
import { radialIdeas } from './radial-ideas.ts';
import { readOnly } from './read-only.ts';
import { refusals } from './refusals.ts';
import { sendRound } from './send-round.ts';
import { summaryCard } from './summary-card.ts';
import { timelineNotForProse } from './timeline-not-for-prose.ts';
import { timelinePlan } from './timeline-plan.ts';
import { timelineUnprompted } from './timeline-unprompted.ts';
import { twoTurns } from './two-turns.ts';
import { wait } from './wait.ts';
import { whereCardsStand } from './where-cards-stand.ts';

export const SCENARIOS: readonly Scenario[] = [
  draw, sendRound, picture, refusals, wait, answeredNote, ownBoard, twoTurns, readOnly,
  whereCardsStand, newCardNumber, insertStep, summaryCard, personBoard, linkedPipeline,
  timelinePlan, timelineUnprompted, timelineNotForProse, copyBoard, importFile,
];
// The modes of the skill's references (node-overhaul T_05) run here, with room under the default run cap for retries.
export const STANDALONE: readonly Scenario[] = [
  ledgerPicture, otherLedger, joinLedger, architectureIcons,
  findingsGrid, flowBranches, lanesHandoffs, radialIdeas, directionDefault, handoverPark, appBuild,
  timelinePlan, timelineUnprompted, timelineNotForProse, copyBoard, importFile,
];

export const scenarioById = (id: string): Scenario => {
  const all = [...SCENARIOS, ...STANDALONE];
  const found = all.find((s) => s.id === id);
  if (!found) throw new Error(`no scenario "${id}" (have: ${all.map((s) => s.id).join(', ')})`);
  return found;
};
