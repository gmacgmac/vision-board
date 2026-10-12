<!-- The Archived list (archiveBoard flag, N39 ruling 6, api.md 137): a modal dialog opened from the
     board picker's "Archived (N)…" (shell.archivedDialog), listing shell.archived (ArchivedList.svelte).
     Focus starts on the first Restore. Restore sends one `restore` act through the board's one sender
     (onrestore); while it is on its way that button says "Restoring…" and the others wait; once
     restored the dialog closes and the board opens; a refusal stays in the dialog. Native <dialog>:
     Esc, Close or a click on the backdrop closes it (not while a Restore is on its way), and focus
     goes back to the picker. Esc closes it at once, not on the close event that follows, so the
     picker's entry chosen again right after opens it again. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { shell } from './shell.svelte.ts';
  import ArchivedList from './ArchivedList.svelte';

  let { onrestore }: { onrestore: (board: string) => Promise<string | null> } = $props();

  const UID = 'archived-dialog';
  let dlg: HTMLDialogElement;
  let busy: string | null = $state(null);
  let problem: string | null = $state(null);

  $effect(() => {
    if (shell.archivedDialog && !dlg.open) {
      [busy, problem] = [null, null];
      dlg.showModal();
      void tick().then(() => (dlg.querySelector<HTMLElement>('.vb-archived-restore') ?? dlg.querySelector<HTMLElement>(`#${UID}-close`))?.focus());
    } else if (!shell.archivedDialog && dlg.open) dlg.close();
  });

  async function restore(board: string) {
    if (busy !== null) return;
    busy = board;
    problem = null;
    problem = await onrestore(board);
    busy = null;
    if (problem === null) shell.archivedDialog = false;
  }

  const close = () => { if (busy === null) shell.archivedDialog = false; };

  /** A click outside the dialog's box (on the backdrop) closes it like Close. */
  function backdrop(e: MouseEvent) {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  }
</script>

<dialog id={UID} class="vb-dialog" aria-labelledby="{UID}-title" aria-describedby="{UID}-body"
  bind:this={dlg} onclick={backdrop} oncancel={(e) => { if (busy !== null) e.preventDefault(); else shell.archivedDialog = false; }}
  onclose={() => { shell.archivedDialog = false; }}>
  <ArchivedList boards={shell.archived} uid={UID} {busy} {problem} onrestore={(b) => void restore(b)} onclose={close} />
</dialog>
