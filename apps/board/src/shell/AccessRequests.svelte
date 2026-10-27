<!-- The requests strip (agentAccess flag, D-027, D-034): under the header while any grant request
     is open, one row per request, "<agent> asks to write in <container>" (or, for the whole board,
     "<agent> wants to draw on this board") and its reason, with Allow and Refuse. Refuse opens a one-line optional note, then sends `deny`; Allow sends `grant`.
     Both are the person's decision (rule 8), sent through the board's act path. A region
     landmark with a heading; a polite live region, always present so it is heard, announces the
     requests in `news`: those that arrived in the page's latest batch (board/cards/attention.ts, the
     `grant.requested` condition). The strip itself shows only while a request is open. The gallery
     passes `refusing` to draw a row with its note open. -->
<script lang="ts">
  import * as accessWords from '../board/words/access.ts';
  import * as shellAccessWords from './words/shell-access.ts';
  import * as shellCommonWords from './words/shell-common.ts';
  import { tick } from 'svelte';
  import type { AccessRequestRow } from './shell.svelte.ts';
  import { askWords } from '../board/access/index.ts';

  let { requests, onanswer, refusing = null, placement = 'board', news = [] }: {
    requests: AccessRequestRow[];
    /** Sends `grant` or `deny`; resolves true when it was recorded. */
    onanswer: (seq: number, answer: 'grant' | 'deny', text?: string) => Promise<boolean>;
    /** The request whose note is open (the gallery); the board opens it with Refuse. */
    refusing?: number | null;
    /** `board`: fixed under the header; `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
    /** The requests to announce, by line: those that arrived while the page was open. */
    news?: readonly number[];
  } = $props();

  // svelte-ignore state_referenced_locally
  let open: number | null = $state(refusing);
  let note = $state('');
  let busy: number | null = $state(null);
  const announce = $derived(requests.filter((r) => news.includes(r.seq)).map((r) => `${r.label} ${askWords(r)}`).join('. '));

  /** On the board the strip pushes the stage down by its height (board.css, --vb-strip-h), so
   * it never covers the top of the board; the property goes when the strip does. */
  let height = $state(0);
  $effect(() => {
    if (placement !== 'board') return;
    const root = document.documentElement.style;
    root.setProperty('--vb-strip-h', `${requests.length ? height : 0}px`);
    return () => root.removeProperty('--vb-strip-h');
  });

  const heading = $derived(shellAccessWords.askForAccess(requests.length));
  const idOf = (seq: number, part: string) => `${placement}-request-${seq}-${part}`;

  /** After an answer the row is gone: focus the next row's Allow, else the board. */
  async function refocus() {
    await tick();
    const next = document.querySelector<HTMLElement>(`[data-placement="${placement}"] .vb-access-allow`);
    (next ?? document.getElementById('stage'))?.focus();
  }

  async function answer(r: AccessRequestRow, a: 'grant' | 'deny', text?: string) {
    if (busy !== null) return;
    busy = r.seq;
    const ok = await onanswer(r.seq, a, text);
    busy = null;
    if (!ok) return;
    open = null;
    note = '';
    await refocus();
  }

  async function startRefuse(r: AccessRequestRow) {
    open = r.seq;
    note = '';
    await tick();
    document.getElementById(idOf(r.seq, 'note'))?.focus();
  }

  async function cancelRefuse(r: AccessRequestRow) {
    open = null;
    await tick();
    document.getElementById(idOf(r.seq, 'refuse'))?.focus();
  }

  function noteKey(e: KeyboardEvent, r: AccessRequestRow) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    void cancelRefuse(r);
  }
</script>

{#if requests.length}
<section class="vb-access" data-placement={placement} aria-labelledby={idOf(0, 'title')} bind:offsetHeight={height}>
  <h2 class="vb-access-title" id={idOf(0, 'title')}>{heading}</h2>
  <ul class="vb-access-list">
    {#each requests as r (r.seq)}
      <li class="vb-access-row" data-request={r.seq} aria-busy={busy === r.seq ? 'true' : undefined}>
        <p class="vb-access-text">
          <span class="vb-access-ask"><b>{r.label}</b>
            {#if r.container === undefined}{shellAccessWords.wantsToDrawOn} <b>{shellAccessWords.thisBoard}</b>{:else}{shellAccessWords.asksToWriteIn2} <b>{r.container}</b>{/if}</span>
          <span class="vb-access-reason">{r.reason}</span>
        </p>
        {#if open === r.seq}
          <form class="vb-access-actions" onsubmit={(e) => { e.preventDefault(); void answer(r, 'deny', note.trim() || undefined); }}>
            <label class="vb-visually-hidden" for={idOf(r.seq, 'note')}>{shellAccessWords.noteForOptional(r.label)}</label>
            <input class="vb-access-note" id={idOf(r.seq, 'note')} type="text" maxlength="4000" autocomplete="off"
              placeholder={shellAccessWords.optionalWhyNot} bind:value={note} onkeydown={(e) => noteKey(e, r)} />
            <button type="submit" class="vb-btn vb-btn-small" aria-label={shellAccessWords.refuse(r.label)}>{shellAccessWords.refuse2}</button>
            <button type="button" class="vb-btn vb-btn-small" onclick={() => cancelRefuse(r)}>{shellCommonWords.cancel}</button>
          </form>
        {:else}
          <div class="vb-access-actions">
            <button type="button" class="vb-btn vb-btn-small vb-btn-primary vb-access-allow"
              aria-label={shellAccessWords.allowTo(r.label, r.container === undefined ? accessWords.drawOnThisBoard : accessWords.writeIn(r.container))} onclick={() => answer(r, 'grant')}>{shellAccessWords.allow}</button>
            <button type="button" class="vb-btn vb-btn-small" id={idOf(r.seq, 'refuse')}
              aria-label={shellAccessWords.refuse(r.label)} onclick={() => startRefuse(r)}>{shellAccessWords.refuse2}</button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>
{/if}
<span class="vb-visually-hidden" id={idOf(0, 'announce')} aria-live="polite">{announce}</span>
