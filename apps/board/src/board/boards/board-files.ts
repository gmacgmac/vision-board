// Export, import and print (D-107, export-import-print PLAN decisions 8-12; boardFiles flag): what the files dialog's one
// button does, through the host's hooks (host.ts `saveFile`, `openFile`, `print`) and the board's calls (io.ts). Where the
// person opened the dialog sets the scope (`ask`): the "⋯" menu, the whole board; a container's settings, that container.
// Export reads the export route (`export_board`) and hands its file to `saveFile`, named after the board (and the
// container). Import asks `openFile` for a `.vboard.json`, reads it as JSON (an upgrade and a check are the server's:
// `write_board`'s `import` takes any object and names what it drops) and writes it as the person, into a new board named
// from its title or into the open one; a new board then opens. Print sets the print view (canvas/print-view.ts), calls the
// host's `print`, and takes the view off when it is done. Each says what went wrong in words, never by throwing.
import type { LedgerState } from '#actions';
import type { BoardHost } from '../host.ts';
import type { Io } from '../io.ts';
import type { PrintScope } from '../canvas/index.ts';
import { ApiError } from '../io.ts';
import { boardIdFor } from './board-edit.ts';
import * as filesWords from '../words/chrome-files.ts';

/** The files dialog, open: what it does, the container it was opened on (none: the whole board) and that container's title. */
export interface FilesAsk { kind: 'print' | 'export' | 'import'; region?: string; title?: string }

/** What Import came to: the problem's words, or what the board left out of the file (none: all of it went in); null when
 *  the person chose no file. */
export type ImportOutcome = { problem: string } | { dropped: readonly string[] } | null;

/** The file types Import asks for (`openFile`'s `accept`). */
export const IMPORT_ACCEPT = '.vboard.json,application/json';
/** An export file's extension (PLAN decision 3). */
export const EXPORT_EXTENSION = '.vboard.json';

export interface BoardFilesDeps {
  host: Pick<BoardHost, 'saveFile' | 'openFile' | 'print'>;
  io: Pick<Io, 'exportBoard' | 'importBoard'>;
  /** The open board; '' before one opens. */
  id(): string;
  state(): LedgerState | null;
  /** Container `region`'s title on the open board. */
  regionTitle(region: string): string | undefined;
  /** Open or close the dialog (the board's status, `files`). */
  show(ask: FilesAsk | null): void;
  /** Set the print view for the board, or one container; what undoes it, or null when nothing is drawn to print. */
  printView(scope: PrintScope): (() => void) | null;
  /** Open board `id` once its first line has arrived (a new board an import made). */
  jump(id: string): void;
  toast(text: string): void;
}

export interface BoardFiles {
  /** Open the dialog for `kind`, on container `region` or the whole board. */
  ask(kind: FilesAsk['kind'], region?: string): void;
  /** Save the board, or container `region`, as an export file; null once handed to the host, else the problem. */
  exportFile(o: { region?: string | undefined; notes: boolean }): Promise<string | null>;
  /** Ask for a file and write it into a new board or the open one. */
  importFile(into: 'new' | 'current'): Promise<ImportOutcome>;
  /** Print the board, or container `region`; null once the host's print has closed, else the problem. */
  print(o: PrintScope): Promise<string | null>;
}

/** A failure's words: the server's problem with its pointer errors, or what the host rejected with. */
const wordsOf = (err: unknown): string =>
  (err instanceof ApiError ? [err.message, ...err.problems].join(' · ') : err instanceof Error ? err.message : String(err));

/** The export file's name: the board's title (and the container's) as an id, then `.vboard.json`. */
export function exportName(board: string, container?: string): string {
  const none = new Set<string>();
  return `${boardIdFor(board, none)}${container === undefined ? '' : `-${boardIdFor(container, none)}`}${EXPORT_EXTENSION}`;
}

/** The chosen file as an export file to send: any JSON object (the server upgrades it and says what it drops); else null. */
export function readExport(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const file: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return file !== null && typeof file === 'object' && !Array.isArray(file) ? file as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function createBoardFiles(d: BoardFilesDeps): BoardFiles {
  const titleOf = (id: string) => d.state()?.boards.get(id)?.title ?? id;
  return {
    ask(kind, region) {
      const title = region === undefined ? undefined : d.regionTitle(region) ?? region;
      d.show({ kind, ...(region !== undefined && { region }), ...(title !== undefined && { title }) });
    },
    async exportFile({ region, notes }) {
      const id = d.id();
      if (!id || !d.host.saveFile) return filesWords.noBoardOpen;
      try {
        const file = await d.io.exportBoard(id, { region, notes });
        const name = exportName(titleOf(id), region === undefined ? undefined : d.regionTitle(region) ?? region);
        await d.host.saveFile(name, 'application/json', new TextEncoder().encode(`${JSON.stringify(file, null, 2)}\n`));
        return null;
      } catch (err) {
        return wordsOf(err);
      }
    },
    async importFile(into) {
      const open = d.id();
      if ((into === 'current' && !open) || !d.host.openFile) return { problem: filesWords.noBoardOpen };
      const picked = await d.host.openFile(IMPORT_ACCEPT).catch((err: unknown) => ({ problem: wordsOf(err) }));
      if (!picked || 'problem' in picked) return picked ?? null;
      const file = readExport(picked.bytes);
      if (!file) return { problem: filesWords.notAnExportFile };
      const title = typeof file.title === 'string' && file.title.trim() ? file.title : picked.name.replace(/\.vboard\.json$|\.json$/i, '');
      const board = into === 'new' ? boardIdFor(title, d.state()?.boards ?? new Set()) : open;
      try {
        const res = await d.io.importBoard(board, into, file);
        if (into === 'new') d.jump(board);
        const dropped = res.dropped ?? [];
        if (!dropped.length) d.toast(filesWords.imported(title));
        return { dropped };
      } catch (err) {
        return { problem: wordsOf(err) };
      }
    },
    async print(scope) {
      if (!d.host.print) return filesWords.noBoardOpen;
      const undo = d.printView(scope);
      if (!undo) return filesWords.noBoardOpen;
      try {
        await d.host.print();
        return null;
      } catch (err) {
        return wordsOf(err);
      } finally {
        undo();
      }
    },
  };
}
