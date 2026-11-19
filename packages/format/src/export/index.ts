// The export file (D-107): a board, or one container, as it stands now, in the shape `write_board` takes back
// (export-file.schema.json). The public file of export/: the format's version and its upgrade chain (upgrade.ts), the
// conditioning an import runs before its write (condition.ts), and what it keeps by who writes it (writer.ts). Pure;
// no `node:` import (`#format` reaches the page).
import type { OperationOutput } from '../api-types.generated.ts';

/** An export file of this build's version, as the export read answers it (`export_board`) and an import writes it. */
export type ExportFile = OperationOutput<'export_board'>;

export { EXPORT_STEPS, EXPORT_VERSION, upgradeExport } from './upgrade.ts';
export type { Conditioned } from './condition.ts';
export { conditionExport } from './condition.ts';
export { keptFor } from './writer.ts';
