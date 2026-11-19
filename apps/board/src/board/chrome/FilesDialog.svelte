<!-- The files dialog (boardFiles flag, D-107, export-import-print PLAN decision 12): Print, Export or Import, opened from the
     "⋯" menu (the whole board) or a container's settings (that container), while the board's status holds `files`. Its
     contents are FilesForm.svelte, which asks only what is left open; this holds it in the shared modal dialog (`#ui`
     `syncModal`, `backdropClick`, `whenShut`) and does the work through the board's files flow (board-files.ts). It always
     opens fresh: the border checked for the board and not for a container, the conversations off, Import into a new board.
     Focus starts on the one button, so Enter does what was asked. Print closes the dialog first, so the print shows the
     board alone, then the host prints; a problem is the host's notice. Export and Import keep it open while they work (the
     button says so; Esc, Cancel and the backdrop wait), close once done, and keep a refusal in it with the choices kept. An
     import that left parts of the file out shows them, and Close. Native <dialog>: focus goes back to what opened it. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { useChrome } from './chrome.svelte.ts';
  import FilesForm from './FilesForm.svelte';
  import { backdropClick, syncModal, whenShut } from '#ui';
  import { LOCKED_PERSON } from '#actions';
  import type { BoardFiles } from '../boards/index.ts';
  import * as filesWords from '../words/chrome-files.ts';

  let { files }: { files: () => BoardFiles | null } = $props();

  const chrome = useChrome();
  const { state: shown, id } = chrome;
  let dlg: HTMLDialogElement;
  let busy = $state(false);
  let problem: string | null = $state(null);
  let dropped: readonly string[] | null = $state(null);
  let border = $state(true);
  let notes = $state(false);
  let into: 'new' | 'current' = $state('new');
  /** Why This board can't take an import: none open, or it is locked. */
  const current = $derived(shown.version === null ? filesWords.noBoardOpen : shown.locked ? LOCKED_PERSON : null);

  $effect(() => {
    const ask = shown.files;
    syncModal(dlg, !!ask, () => {
      if (!ask) return;
      [busy, problem, dropped, border, notes, into] = [false, null, null, ask.region === undefined, false, 'new'];
      void tick().then(() => dlg.querySelector<HTMLElement>(`#${id('files-go')}`)?.focus());
    });
  });

  const close = () => { if (!busy) shown.files = null; };
  const backdrop = backdropClick(close);

  async function act() {
    const ask = shown.files;
    const flow = files();
    if (!ask || !flow || busy) return;
    if (dropped) return close();
    problem = null;
    if (ask.kind === 'print') {
      shown.files = null;
      await tick();
      const failed = await flow.print({ region: ask.region, border });
      if (failed !== null) chrome.notify(failed, 'error');
      return;
    }
    busy = true;
    if (ask.kind === 'export') {
      problem = await flow.exportFile({ region: ask.region, notes });
      busy = false;
      if (problem === null) shown.files = null;
      return;
    }
    const out = await flow.importFile(into);
    busy = false;
    if (out === null) return;
    if ('problem' in out) problem = out.problem;
    else if (out.dropped.length) dropped = out.dropped;
    else shown.files = null;
  }
</script>

<dialog id={id('files-dialog')} class="vb-dialog" aria-labelledby={id('files-title')} aria-describedby={id('files-body')} aria-busy={busy}
  bind:this={dlg} onclick={backdrop} oncancel={(e) => { if (busy) e.preventDefault(); else shown.files = null; }}
  onclose={whenShut(() => { shown.files = null; })}>
  {#if shown.files}
    <FilesForm ask={shown.files} idOf={id} {busy} {problem} {dropped} {current} bind:border bind:notes bind:into onsubmit={() => void act()} oncancel={close} />
  {/if}
</dialog>
