<!-- The New ledger dialog's form (ledgerFolders flag; LEDGER_UI_01), the board dialog's pattern
     (board/chrome/BoardDialog.svelte): a heading, what a ledger is, the name with its rule under it, "Keep out of git"
     (off) with what it means, a refusal in the server's words, then Cancel and Create. The name is shown as typed in
     its id form (lowercase, a space as -; ledgers.ts `typedLedgerName`) and checked as it is typed against the shared
     rule (`#format` `ledgerNameProblem`, never a copy) and the folder's ledgers; the rule's line turns into the problem,
     announced politely, and Create sends nothing while there is one. While Create is on its way it is busy and the
     fields wait. LedgerDialog.svelte holds it in the modal; the gallery draws it in the page flow, in each state. -->
<script lang="ts">
  import { LEDGER_NAME_MAX, ledgerNameProblem } from '#format';
  import * as chromeCommonWords from '../board/words/chrome-common.ts';
  import { typedLedgerName } from './ledgers.ts';
  import * as ledgerWords from './words/ledgers.ts';

  let { uid, name = $bindable(''), keepOut = $bindable(false), taken, problem = null, busy = false, oncreate, oncancel, input = $bindable() }: {
    uid: string;
    name?: string;
    keepOut?: boolean;
    /** The folder's ledgers by name: one of them is not a new name. */
    taken: readonly string[];
    /** The server's refusal, in its words. */
    problem?: string | null;
    busy?: boolean;
    oncreate: (name: string, keepOut: boolean) => void;
    oncancel: () => void;
    input?: HTMLInputElement | undefined;
  } = $props();

  const check = $derived(name ? (ledgerNameProblem(name) ?? (taken.includes(name) ? ledgerWords.ledgerThere(name) : undefined)) : undefined);

  /** Shown as typed in its id form; the caret stays after what was typed before it. */
  function typed(field: HTMLInputElement) {
    const at = typedLedgerName(field.value.slice(0, field.selectionStart ?? field.value.length)).length;
    name = typedLedgerName(field.value);
    if (field.value !== name) {
      field.value = name;
      field.setSelectionRange(at, at);
    }
  }

  function create(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name || check) { input?.focus(); return; }
    oncreate(name, keepOut);
  }
</script>

<form onsubmit={create}>
  <h2 id="{uid}-title">{ledgerWords.newLedgerHeading}</h2>
  <p id="{uid}-body" class="vb-dialog-item">{ledgerWords.aLedgerKeepsIts}</p>
  <label class="vb-field" for="{uid}-name">{ledgerWords.name}</label>
  <input id="{uid}-name" class="vb-input" required maxlength={LEDGER_NAME_MAX} autocomplete="off" spellcheck="false" autocapitalize="none"
    aria-invalid={check ? true : undefined} aria-describedby="{uid}-check" readonly={busy} value={name} oninput={(e) => typed(e.currentTarget)} bind:this={input} />
  <p id="{uid}-check" class="vb-ledger-check" data-problem={check ? '' : undefined} aria-live="polite">{check ?? ledgerWords.nameRule}</p>
  <label class="vb-ledger-git" for="{uid}-git">
    <input id="{uid}-git" type="checkbox" checked={keepOut} disabled={busy} aria-describedby="{uid}-git-note" onchange={(e) => { keepOut = e.currentTarget.checked; }} />
    <span>{ledgerWords.keepOutOfGit}</span>
  </label>
  <p id="{uid}-git-note" class="vb-dialog-hint vb-ledger-git-note">{ledgerWords.keepOutOfGitNote}</p>
  {#if problem}<p id="{uid}-problem" class="vb-dialog-problem" role="alert">{problem}</p>{/if}
  <div class="vb-dialog-actions">
    <button type="button" class="vb-btn" id="{uid}-cancel" onclick={oncancel}>{chromeCommonWords.cancel}</button>
    <button type="submit" class="vb-btn vb-btn-primary" id="{uid}-create" disabled={busy} aria-busy={busy}>
      {busy ? chromeCommonWords.creating : chromeCommonWords.create}
    </button>
  </div>
</form>
