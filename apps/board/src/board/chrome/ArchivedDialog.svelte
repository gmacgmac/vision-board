<!-- The Archived list (archiveBoard flag, N39 ruling 6, api.md 137): a modal dialog opened from the
     board picker's "Archived (N)…" (shown.archivedDialog), listing shown.archived (ArchivedList.svelte).
     Focus starts on the first Restore. Restore sends one `restore` act through the board's one sender
     (onrestore); while it is on its way that button says "Restoring…" and the others wait; once
     restored the dialog closes and the board opens; a refusal stays in the dialog. Native <dialog>:
     Esc, Close or a click on the backdrop closes it (not while a Restore is on its way), and focus
     goes back to the picker. Esc closes it at once, not on the close event that follows, so the
     picker's entry chosen again right after opens it again; and that close event, queued as a task
     after the dialog shut, is taken only while the dialog is still shut: arriving after the entry
     has opened it again, it closes nothing (the flake in picker-archive.spec.ts, N40 step 5). Opened,
     closed and closed by its backdrop by the shared modal dialog (`#ui` `syncModal`, `backdropClick`,
     `whenShut`). -->
<script lang="ts">
  import { tick } from 'svelte';
  import { useChrome } from './chrome.svelte.ts';
  import ArchivedList from './ArchivedList.svelte';
  import { backdropClick, syncModal, whenShut } from '#ui';
  import { READ_ONLY_PERSON } from '#actions';

  let { onrestore }: { onrestore: (board: string) => Promise<string | null> } = $props();

  const { state: shown, id } = useChrome();
  const UID = id('archived-dialog');
  let dlg: HTMLDialogElement;
  let busy: string | null = $state(null);
  let problem: string | null = $state(null);

  $effect(() => {
    syncModal(dlg, shown.archivedDialog, () => {
      [busy, problem] = [null, null];
      void tick().then(() => (dlg.querySelector<HTMLElement>('.vb-archived-restore') ?? dlg.querySelector<HTMLElement>(`#${UID}-close`))?.focus());
    });
  });

  async function restore(board: string) {
    if (busy !== null) return;
    busy = board;
    problem = null;
    problem = await onrestore(board);
    busy = null;
    if (problem === null) shown.archivedDialog = false;
  }

  const close = () => { if (busy === null) shown.archivedDialog = false; };

  /** A click on the backdrop closes it like Close. */
  const backdrop = backdropClick(close);
</script>

<dialog id={UID} class="vb-dialog" aria-labelledby="{UID}-title" aria-describedby="{UID}-body"
  bind:this={dlg} onclick={backdrop} oncancel={(e) => { if (busy !== null) e.preventDefault(); else shown.archivedDialog = false; }}
  onclose={whenShut(() => { shown.archivedDialog = false; })}>
  <ArchivedList boards={shown.archived} uid={UID} {busy} {problem} paused={shown.readOnly ? READ_ONLY_PERSON : undefined} onrestore={(b) => void restore(b)} onclose={close} />
</dialog>
