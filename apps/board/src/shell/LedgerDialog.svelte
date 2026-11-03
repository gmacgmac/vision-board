<!-- New ledger (ledgerFolders flag, PLAN decisions 8 and 10; LEDGER_UI_01): a modal dialog opened from the ledger list's
     New ledger… or the "⋯" menu's (shell.ledgerDialog). It always opens fresh, the name empty and "Keep out of git" off,
     with focus in the name. Create sends `open_project` with the folder, the name, `create` and `keepOutOfGit`
     (ledgers.ts `openLedger`), and the page reloads onto the new ledger; while it is on its way Create is busy and Esc,
     Cancel and the backdrop wait; a refusal stays in the dialog, the words kept. A note's unsaved words ask first, as in
     the folder dialog: this closes, the board asks, and Cancel leaves page and server where they were; a refusal after
     that is a toast. Native <dialog>, opened, closed and closed by its backdrop by the shared modal dialog
     (`#ui` `syncModal`, `backdropClick`, `whenShut`); focus goes back where it was. The form is LedgerForm.svelte. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { backdropClick, syncModal, whenShut } from '#ui';
  import LedgerForm from './LedgerForm.svelte';
  import { openLedger, problemWords, unsavedAsk } from './ledgers.ts';
  import { shell, toast } from './shell.svelte.ts';

  const UID = 'ledger-dialog';
  let dlg: HTMLDialogElement;
  let input: HTMLInputElement | undefined = $state();
  let name = $state('');
  let keepOut = $state(false);
  let problem: string | null = $state(null);
  let busy = $state(false);
  const taken = $derived((shell.folder?.ledgers ?? []).map((l) => l.name));

  $effect(() => {
    syncModal(dlg, shell.ledgerDialog, () => {
      [name, keepOut, problem, busy] = ['', false, null, false];
      if (input) input.value = '';
      input?.focus();
    });
  });

  async function create(ledger: string, keep: boolean) {
    // Unsaved words ask first, before anything is made: this closes so Cancel's focus can go back in the note.
    const ask = unsavedAsk();
    if (ask) {
      shell.ledgerDialog = false;
      await tick();
      if (await ask()) await openLedger(ledger, true, keep).catch((err: unknown) => toast(problemWords(err), 'error'));
      return;
    }
    busy = true;
    problem = null;
    try {
      await openLedger(ledger, true, keep);
    } catch (err) {
      problem = problemWords(err);
      busy = false;
    }
  }

  const close = () => { if (!busy) shell.ledgerDialog = false; };
  const backdrop = backdropClick(close);
</script>

<dialog id={UID} class="vb-dialog vb-ledger-dialog" aria-labelledby="{UID}-title" aria-describedby="{UID}-body"
  bind:this={dlg} onclick={backdrop} oncancel={(e) => { if (busy) e.preventDefault(); }}
  onclose={whenShut(() => { shell.ledgerDialog = false; })}>
  <LedgerForm uid={UID} bind:name bind:keepOut bind:input {taken} {problem} {busy} oncreate={(l, k) => void create(l, k)} oncancel={close} />
</dialog>
