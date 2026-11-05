// The eval's hard limits (PLAN.md § Hard limits, the maintainer's "no eternal loops"), in one place, enforced by the
// code that imports them: a run that can't be held to these is not started. The CLI's own caps (`--max-budget-usd`,
// `--max-turns`) are passed on every run; the rest are ours: the kill of the run's process group, the `wait` clamp at
// the host's door, a deadline on every call, and the per-invocation run and spend caps, which a flag may lower but
// never raise past the ceilings.

/** Each model run: the CLI stops spending past this (checked by the CLI between its API calls). */
export const RUN_USD = 0.5;
/** Each model run: the CLI's turn cap (one tool round trip is a turn). */
export const RUN_TURNS = 15;
/** Each model run, every turn of it included: its whole process group is killed at this, SIGTERM then SIGKILL. */
export const RUN_KILL_MS = 180_000;
export const KILL_GRACE_MS = 5_000;
/** A `check_responses` `wait` the bot asks for is cut to this at the door; the record keeps what it asked. */
export const WAIT_CLAMP_S = 5;
/** Every engine call at the door. */
export const CALL_MS = 30_000;
/** Every pass-through request to the door: longer than a clamped wait plus a call. */
export const DOOR_MS = 40_000;
/** The pass-through ends itself after this, whatever its parent does. */
export const PASS_THROUGH_LIFE_MS = 200_000;
/** Building the plugin folder before a real run. */
export const BUILD_MS = 120_000;

/** Per invocation of the eval: defaults, and ceilings no flag may pass. */
export const MAX_RUNS = 16;
export const MAX_USD = 3;
export const CEILING_RUNS = 30;
export const CEILING_USD = 10;
/** A run that crashed (no answer for a turn, not killed by us, not stopped by a cap) is tried once more; a run
 * that failed a check never is. */
export const CRASH_RETRIES = 1;
