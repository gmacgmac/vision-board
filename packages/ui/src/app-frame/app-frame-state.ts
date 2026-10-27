// App frame pattern, layer 1 (core), the board's own state request (apps.md § Saving the panel's
// state, D-050): what a panel's `vision-board/save-state` may carry, checked as its schema
// (panel-state.schema.json `$defs/save`: params `{ state }` and nothing else) and `appStateProblem`
// (a JSON value within `APP_LIMITS.stateBytes`) say. No DOM; app-frame-core.ts answers with it.
import type { AppStateValue } from '#format';
import { appStateBytes, appStateProblem, PANEL_ERRORS, PANEL_SAVE_STATE } from '#format';

/** What a refused save says when the page could not keep the value; over the limit it says
 * `appStateProblem`'s words. `data.problem` carries the code. */
export const SAVE_WORDS = "The board didn't save the panel's state.";

/** A save's params checked: the value as JSON keeps it, or the error to answer with. */
export type SaveCheck =
  | { value: AppStateValue }
  | { error: { code: number; message: string; data?: { problem: string } } };

export function checkSave(params: Record<string, unknown>): SaveCheck {
  const keys = Object.keys(params);
  if (keys.length !== 1 || keys[0] !== 'state') {
    return { error: { code: PANEL_ERRORS.invalidParams, message: `${PANEL_SAVE_STATE} takes params { state } and nothing else.` } };
  }
  const problem = appStateProblem(params.state);
  if (problem && appStateBytes(params.state) === undefined) return { error: { code: PANEL_ERRORS.invalidParams, message: problem } };
  if (problem) return { error: { code: PANEL_ERRORS.failed, message: problem, data: { problem: 'too-large' } } };
  // What JSON keeps (no undefined fields): the value the page writes and the panel gets back.
  return { value: JSON.parse(JSON.stringify(params.state)) as AppStateValue };
}
