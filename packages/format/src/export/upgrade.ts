// The export file's upgrade chain (D-107, PLAN decision 5): the ledger's pattern (migrate/), one step per export version
// that did more than add, run by the same chain runner (`runUpgradeChain`). Empty today: version 1 is the first. A file
// the chain can't bring to `EXPORT_VERSION` stops with words, never guessed at. Pure.
import type { UpgradeStep, UpgradeStop } from '../migrate/index.ts';
import { isUpgradeStop, runUpgradeChain } from '../migrate/index.ts';
import { isRecord } from '../records.ts';
import * as formatExportWords from '../words/format-export.ts';

/** The export format's version: what this build writes and reads (export-file.schema.json `v`; a test holds them equal). */
export const EXPORT_VERSION = 1;

/** One step per older export version, oldest first. */
export const EXPORT_STEPS: readonly UpgradeStep[] = [];

/** The file at `EXPORT_VERSION`, or why it can't be: not an export file (no whole-number `v`), one a newer build made,
 * or one no step leads on from. A file already current comes back untouched (the same object). `steps` is for tests. */
export function upgradeExport(file: unknown, steps: readonly UpgradeStep[] = EXPORT_STEPS): Record<string, unknown> | UpgradeStop {
  if (!isRecord(file) || !Number.isInteger(file.v) || (file.v as number) < 0) return { stop: formatExportWords.notAnExportFile };
  const v = file.v as number;
  if (v > EXPORT_VERSION) return { stop: formatExportWords.newerExport(v, EXPORT_VERSION) };
  const out = runUpgradeChain(file, EXPORT_VERSION, (from) => steps.find((s) => s.from === from));
  if (isUpgradeStop(out) || out.v === EXPORT_VERSION) return out;
  return { stop: formatExportWords.noStepFrom(v, EXPORT_VERSION) };
}
