<!-- The files dialog's contents (boardFiles flag, D-107, export-import-print PLAN decisions 8-12): one form for Print,
     Export and Import, which asks only what the place it was opened from leaves open. The scope (the board, or the
     container `ask.region` named in its words) is already chosen. Print: the container border (`border`), checked for the
     board and not for a container, and light or dark (`theme`, the screen's first; point 615). Export: whether the conversations on notes go too (`notes`, unchecked). Import: into a
     new board or this one (`into`), This board off, saying why, while `current` gives a reason; once done with parts left out
     (`dropped`), the list of them and Close. The one button acts; while it works it says so (aria-busy) and Cancel waits; a
     problem shows above the buttons and the choices are kept. A view only: FilesDialog.svelte holds it in the modal dialog and
     does the work; the gallery draws it in each state. `idOf` gives each control its id (the board's, or a sample's own).
     Native controls only: Tab reaches each, Space checks, the arrows move between the two radios, Enter acts. -->
<script lang="ts">
  import * as filesWords from '../words/chrome-files.ts';
  import * as chromeCommonWords from '../words/chrome-common.ts';
  import * as chromeBoardsWords from '../words/chrome-boards.ts';
  import type { FilesAsk } from '../boards/index.ts';

  let { ask, idOf, busy = false, problem = null, dropped = null, current = null, border = $bindable(true), theme = $bindable('light'), notes = $bindable(false), into = $bindable('new'), onsubmit, oncancel }: {
    ask: FilesAsk;
    idOf: (name: string) => string;
    busy?: boolean;
    problem?: string | null;
    /** What the import left out, once done; null before. */
    dropped?: readonly string[] | null;
    /** Why This board can't take an import now (none open, locked); null when it can. */
    current?: string | null;
    border?: boolean;
    theme?: 'light' | 'dark';
    notes?: boolean;
    into?: 'new' | 'current';
    onsubmit: () => void;
    oncancel: () => void;
  } = $props();

  const container = $derived(ask.region !== undefined);
  const title = $derived(ask.title ?? ask.region ?? '');
  const heading = $derived(ask.kind === 'print' ? (container ? filesWords.printContainer : filesWords.printBoard)
    : ask.kind === 'export' ? (container ? filesWords.exportContainer : filesWords.exportBoardHeading) : filesWords.importHeading);
  const body = $derived(ask.kind === 'print' ? (container ? filesWords.printContainerBody(title) : filesWords.printBoardBody)
    : ask.kind === 'export' ? (container ? filesWords.exportContainerBody(title) : filesWords.exportBoardBody) : filesWords.importBody);
  const done = $derived(!!dropped?.length);
  const label = $derived(done ? chromeBoardsWords.close
    : ask.kind === 'print' ? (busy ? filesWords.printing : filesWords.printName)
      : ask.kind === 'export' ? (busy ? filesWords.exporting : filesWords.exportName) : busy ? filesWords.importing : filesWords.goImport);
</script>

<form class="vb-files" data-kind={ask.kind} onsubmit={(e) => { e.preventDefault(); if (!busy) onsubmit(); }}>
  <h2 id={idOf('files-title')}>{heading}</h2>
  <p id={idOf('files-body')} class="vb-dialog-item">{done ? filesWords.leftOut : body}</p>
  {#if done}
    <ul class="vb-files-dropped" aria-labelledby={idOf('files-body')}>
      {#each dropped ?? [] as part, i (i)}<li>{part}</li>{/each}
    </ul>
  {:else if ask.kind === 'print'}
    <label class="vb-choice" for={idOf('files-border')}>
      <input id={idOf('files-border')} type="checkbox" bind:checked={border} disabled={busy} />
      <span>{container ? filesWords.borderContainer : filesWords.borderBoard}</span>
    </label>
    <fieldset class="vb-choices" disabled={busy}>
      <legend class="vb-field">{filesWords.printIn}</legend>
      {#each [['light', filesWords.light], ['dark', filesWords.dark]] as const as [value, word] (value)}
        <label class="vb-choice" for={idOf(`files-theme-${value}`)}>
          <input id={idOf(`files-theme-${value}`)} type="radio" name={idOf('files-theme')} {value} bind:group={theme} />
          <span>{word}</span>
        </label>
      {/each}
    </fieldset>
  {:else if ask.kind === 'export'}
    <label class="vb-choice" for={idOf('files-notes')}>
      <input id={idOf('files-notes')} type="checkbox" bind:checked={notes} disabled={busy} aria-describedby={idOf('files-notes-hint')} />
      <span>{filesWords.notes}</span>
    </label>
    <p id={idOf('files-notes-hint')} class="vb-dialog-hint vb-choice-note">{filesWords.notesHint}</p>
  {:else}
    <fieldset class="vb-choices" disabled={busy}>
      <legend class="vb-field">{filesWords.into}</legend>
      <label class="vb-choice" for={idOf('files-into-new')}>
        <input id={idOf('files-into-new')} type="radio" name={idOf('files-into')} value="new" bind:group={into} />
        <span>{filesWords.intoNew}</span>
      </label>
      <label class="vb-choice" for={idOf('files-into-current')}>
        <input id={idOf('files-into-current')} type="radio" name={idOf('files-into')} value="current" bind:group={into} disabled={!!current}
          aria-describedby={current ? idOf('files-into-why') : undefined} />
        <span>{filesWords.intoCurrent}</span>
      </label>
      {#if current}<p id={idOf('files-into-why')} class="vb-dialog-hint vb-choice-note">{current}</p>{/if}
    </fieldset>
  {/if}
  {#if problem}<p id={idOf('files-problem')} class="vb-dialog-problem" role="alert">{problem}</p>{/if}
  <div class="vb-dialog-actions">
    {#if !done}<button type="button" class="vb-btn" id={idOf('files-cancel')} aria-disabled={busy} onclick={() => { if (!busy) oncancel(); }}>{chromeCommonWords.cancel}</button>{/if}
    <button type="submit" class="vb-btn vb-btn-primary" id={idOf('files-go')} aria-busy={busy}>{label}</button>
  </div>
</form>
