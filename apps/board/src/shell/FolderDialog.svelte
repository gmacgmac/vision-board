<!-- The folder picker (openFolder flag, open-folder task, api.md 110-113): a modal dialog opened from
     the "⋯" menu's Open folder… row (shell.folderDialog). It lists the home folder first
     (`list_folders`); choosing a folder lists it, with focus on Open when it has a Vision Board, else
     on the first folder in it (else on Create); the recent list is a Shift+Tab away. Open or Create sends `open_project` and, once the server
     has switched, reloads the page onto the new folder without its board hash (folder.ts); a
     refusal stays in the dialog. Native <dialog>: Esc, Cancel or a click on the backdrop closes it
     (not while Open is on its way), and focus goes back to "⋯"; its close event, queued after it shut,
     is taken only while it is still shut, as in ArchivedDialog.svelte. The view is FolderPicker.svelte; with the currentFolder flag it also shows the open
     folder on a "Current folder" line with Copy. Opened, closed and closed by its backdrop by the shared
     modal dialog (`#ui` `syncModal`, `backdropClick`, `whenShut`). With `guard` (the board, leavePrompt
     flag; M11_01-R4) a note's unsaved words ask before the server switches: the dialog closes, the
     board asks, and Cancel leaves page and server on the same folder with focus back in the note.
     The system's folder chooser (systemFolderChooser flag, D-110; offered when the listing says `chooser`): "Choose in
     Finder…" asks the server to open it (`choose_folder`); while it is open the status line says so and Cancel still
     closes this dialog, aborting the call, which closes the chooser too. The pick, or a recent folder outside home (which
     can't be listed), is the chosen folder (`picked`): shown on its own line, with Open or Create, as a listed one is;
     choosing anything in the lists goes back to them. A refusal (a hidden pick) shows in the problem line. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { shell, toast } from './shell.svelte.ts';
  import type { BoardView } from '../board/host.ts';
  import FolderPicker from './FolderPicker.svelte';
  import { backdropClick, syncModal, whenShut } from '#ui';
  import { chooseFolder, listFolders, openProject, type FolderChoice, type FolderEntry, type FolderHead, type FolderList } from './page-io.ts';
  import { currentFolderOn, folderChooserOn, reloadOnto } from './folder.ts';

  /** The board, asked before the folder changes under it (leavePrompt flag); none: nothing asks. */
  let { guard = null }: { guard?: Pick<BoardView, 'unsaved' | 'leave'> | null } = $props();

  const UID = 'folder-dialog';
  let dlg: HTMLDialogElement;
  let listing: FolderList | null = $state(null);
  let loading = $state(false);
  let problem: string | null = $state(null);
  let busy = $state(false);
  /** A folder chosen apart from the listing: picked in the system's chooser, or a recent one outside home (D-110). */
  let picked: FolderHead | null = $state(null);
  /** The system's chooser call on its way; aborting it closes the chooser. */
  let choosing: AbortController | null = $state(null);
  /** The latest listing asked for; an older answer is dropped. */
  let asked = 0;

  const words = (err: unknown) => (err instanceof Error ? err.message : String(err));

  /** Focus where the next step is: Open on a folder with a board (or Open or Create on a chosen one), else its first
   * folder, else Create. */
  function focusNext() {
    const accept = dlg.querySelector<HTMLButtonElement>(`#${UID}-accept:not(:disabled)`);
    const first = dlg.querySelector<HTMLButtonElement>('.vb-folder-in .vb-folder-row');
    const target = picked ? accept : listing?.found ? accept ?? first : first ?? accept;
    (target ?? dlg.querySelector<HTMLButtonElement>(`#${UID}-cancel`))?.focus();
  }

  async function choose(path?: string) {
    const ask = ++asked;
    loading = true;
    problem = null;
    picked = null;
    try {
      const next = await listFolders(path);
      if (ask !== asked) return;
      listing = next;
      loading = false;
      await tick();
      focusNext();
    } catch (err) {
      if (ask !== asked) return;
      problem = words(err);
      loading = false;
    }
  }

  $effect(() => {
    syncModal(dlg, shell.folderDialog, () => {
      [listing, problem, busy, picked] = [null, null, false, null];
      void choose();
    });
  });

  /** A chosen folder, on its own line with Open or Create. */
  async function choosePicked(folder: FolderHead) {
    asked++; // a listing still on its way no longer replaces it
    [picked, problem, loading] = [folder, null, false];
    await tick();
    focusNext();
  }

  /** A recent folder outside home: it can't be listed, so it is the chosen folder. */
  const pickRecent = (f: FolderEntry) => void choosePicked({ path: f.path, name: f.name, found: f.hasBoard });

  /** Ask the server to open the system's folder chooser; the pick becomes the chosen folder. */
  async function inFinder() {
    if (choosing || busy) return;
    const call = new AbortController();
    [choosing, problem] = [call, null];
    let answer: FolderChoice;
    try {
      answer = await chooseFolder(call.signal);
    } catch (err) {
      if (!call.signal.aborted) problem = words(err);
      return;
    } finally {
      if (choosing === call) choosing = null; // first, so Open is enabled when focus goes to it
    }
    if (!call.signal.aborted && !('cancelled' in answer)) await choosePicked(answer);
  }

  /** The dialog is closing: a chooser still open closes too. */
  function stopChoosing() {
    choosing?.abort();
    choosing = null;
  }

  /** Open the folder on the server, then reload onto it. */
  async function openFolder(path: string, create: boolean) {
    await openProject(path, create);
    reloadOnto();
  }

  async function accept() {
    const target = picked ?? listing;
    if (!target || busy || choosing) return;
    const { path, found } = target;
    // Unsaved words ask first, before anything switches: this dialog closes so Cancel's focus can go
    // back in the note; once discarded, a refusal shows as a toast (the dialog is gone).
    if (guard?.unsaved()) {
      shell.folderDialog = false;
      await tick();
      if (await guard.leave()) await openFolder(path, !found).catch((err: unknown) => toast(words(err), 'error'));
      return;
    }
    busy = true;
    problem = null;
    try {
      await openFolder(path, !found);
    } catch (err) {
      problem = words(err);
      busy = false;
    }
  }

  const close = () => {
    if (busy) return;
    stopChoosing();
    shell.folderDialog = false;
  };

  /** A click on the backdrop closes it like Cancel. */
  const backdrop = backdropClick(close);
</script>

<dialog id={UID} class="vb-dialog vb-folder-dialog" aria-labelledby="{UID}-title" aria-describedby="{UID}-body"
  bind:this={dlg} onclick={backdrop} oncancel={(e) => { if (busy) e.preventDefault(); }}
  onclose={whenShut(() => { stopChoosing(); shell.folderDialog = false; })}>
  <FolderPicker uid={UID} {listing} current={shell.folder?.path ?? null} here={currentFolderOn() ? shell.folder : null} {loading} {problem} {busy}
    {picked} chooser={folderChooserOn() && listing?.chooser === true} choosing={choosing !== null}
    onchoose={(p) => void choose(p)} onpick={pickRecent} onfinder={() => void inFinder()} onaccept={() => void accept()} oncancel={close} />
</dialog>
