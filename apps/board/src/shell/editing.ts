// The open ledger's read-only state on the page, and Edit and Stop editing (readOnlyStart flag, D-085 2 and 5;
// READONLY_UI_01). The server says it: `get_project`'s `readOnly` and `editing` (READONLY_01), read with the folder at
// boot (folder.ts), again after each press (the press answers with the folder) and whenever the board's reads change
// their `readOnly` (another tab pressed, another computer let go). Edit takes the ledger's lock now
// (page-io.ts `editLedger`), or is refused naming the computer that holds it: the refusal is a toast and the ledger
// stays read-only (said with the holder `get_project` names, else in the server's words). Stop editing gives the lock back. The chip (EditChip.svelte), the button and the "⋯" row
// (EditButton.svelte) all come here. With the server opened for editing (`--edit`) the folder says neither, and
// nothing shows.
import { openFolderOn } from './folder.ts';
import { problemWords } from './ledgers.ts';
import type { FolderInfo } from './page-io.ts';
import { editLedger, getProject, stopEditing } from './page-io.ts';
import { shell, toast } from './shell.svelte.ts';
import * as editingWords from './words/editing.ts';

/** The state chip and its actions (needs openFolder, which reads the folder). Not the page's own `readOnlyStart`: the
 *  server says whether the ledger is read-only, and a ledger the person can't write always shows it, with Edit
 *  (decision 16; FIX_01 F11). With nothing said, the chip and Edit draw nothing. */
export const editingOn = (): boolean => openFolderOn();

/** What the header shows: nothing (the flag off on the server, or opened for editing), read-only, or editing here. */
export type EditState = 'none' | 'read-only' | 'editing';

export const editState = (f: Pick<FolderInfo, 'readOnly' | 'editing'> | null | undefined): EditState =>
  (f?.readOnly ? 'read-only' : f?.editing && 'here' in f.editing ? 'editing' : 'none');

/** Another computer holding the ledger: who, and since when (a time today, else a date and time). */
export function holder(f: Pick<FolderInfo, 'editing'> | null | undefined, now = new Date()): { host: string; since: string } | null {
  const e = f?.editing;
  if (!e || !('host' in e)) return null;
  const at = new Date(e.since);
  const today = at.toDateString() === now.toDateString();
  const time = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return { host: e.host, since: today ? time : `${at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}` };
}

/** The chip's tooltip and accessible name: the whole state. */
export function stateTip(f: Pick<FolderInfo, 'readOnly' | 'editing'> | null | undefined): string {
  if (editState(f) === 'editing') return editingWords.editingHere;
  const who = holder(f);
  return who ? editingWords.readOnlyEditedOn(who.host, who.since) : editingWords.readOnlyPressEdit;
}

/** Read the folder again (its `readOnly` and `editing`); a failed read leaves what the page has. */
export async function readEditing(): Promise<void> {
  try { shell.folder = await getProject(); } catch { /* the board's own reads still say read-only */ }
}

/** Edit, or Stop editing, as the state asks; the press shows busy until the server answers. A refusal is a toast. */
export async function toggleEditing(): Promise<void> {
  if (shell.editBusy) return;
  const stop = editState(shell.folder) === 'editing';
  shell.editBusy = stop ? 'stop' : 'edit';
  try {
    shell.folder = await (stop ? stopEditing() : editLedger());
  } catch (err) {
    await readEditing(); // who holds it now, for the toast and the chip's tooltip
    const who = stop ? null : holder(shell.folder);
    toast(who ? editingWords.editRefused(who.host, who.since) : problemWords(err), 'error');
  } finally {
    shell.editBusy = null;
  }
}
