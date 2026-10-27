<!-- The folder picker (openFolder flag, open-folder task, api.md 110-113): a modal dialog opened from
     the "⋯" menu's Open folder… row (shell.folderDialog). It lists the home folder first
     (`list_folders`); choosing a folder lists it, with focus on Open when it has a Vision Board, else
     on the first folder in it (else on Create); the recent list is a Shift+Tab away. Open or Create sends `open_project` and, once the server
     has switched, reloads the page onto the new folder without its board hash (board/folder.ts); a
     refusal stays in the dialog. Native <dialog>: Esc, Cancel or a click on the backdrop closes it
     (not while Open is on its way), and focus goes back to "⋯"; its close event, queued after it shut,
     is taken only while it is still shut, as in ArchivedDialog.svelte. The view is FolderPicker.svelte; with the currentFolder flag it also shows the open
     folder on a "Current folder" line with Copy. Opened, closed and closed by its backdrop by the shared
     modal dialog (`#ui` `syncModal`, `backdropClick`, `whenShut`). -->
<script lang="ts">
  import { tick } from 'svelte';
  import { shell } from './shell.svelte.ts';
  import FolderPicker from './FolderPicker.svelte';
  import { backdropClick, syncModal, whenShut } from '#ui';
  import { listFolders, openProject, type FolderList } from '../board/io.ts';
  import { currentFolderOn, reloadOnto } from '../board/folder.ts';

  const UID = 'folder-dialog';
  let dlg: HTMLDialogElement;
  let listing: FolderList | null = $state(null);
  let loading = $state(false);
  let problem: string | null = $state(null);
  let busy = $state(false);
  /** The latest listing asked for; an older answer is dropped. */
  let asked = 0;

  const words = (err: unknown) => (err instanceof Error ? err.message : String(err));

  /** Focus where the next step is: Open on a folder with a board, else its first folder, else Create. */
  function focusNext() {
    const accept = dlg.querySelector<HTMLButtonElement>(`#${UID}-accept:not(:disabled)`);
    const first = dlg.querySelector<HTMLButtonElement>('.vb-folder-in .vb-folder-row');
    const target = listing?.found ? accept ?? first : first ?? accept;
    (target ?? dlg.querySelector<HTMLButtonElement>(`#${UID}-cancel`))?.focus();
  }

  async function choose(path?: string) {
    const ask = ++asked;
    loading = true;
    problem = null;
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
      [listing, problem, busy] = [null, null, false];
      void choose();
    });
  });

  async function accept() {
    if (!listing || busy) return;
    busy = true;
    problem = null;
    try {
      await openProject(listing.path, !listing.found);
      reloadOnto();
    } catch (err) {
      problem = words(err);
      busy = false;
    }
  }

  const close = () => { if (!busy) shell.folderDialog = false; };

  /** A click on the backdrop closes it like Cancel. */
  const backdrop = backdropClick(close);
</script>

<dialog id={UID} class="vb-dialog vb-folder-dialog" aria-labelledby="{UID}-title" aria-describedby="{UID}-body"
  bind:this={dlg} onclick={backdrop} oncancel={(e) => { if (busy) e.preventDefault(); }}
  onclose={whenShut(() => { shell.folderDialog = false; })}>
  <FolderPicker uid={UID} {listing} current={shell.folder?.path ?? null} here={currentFolderOn() ? shell.folder : null} {loading} {problem} {busy}
    onchoose={(p) => void choose(p)} onaccept={() => void accept()} oncancel={close} />
</dialog>
