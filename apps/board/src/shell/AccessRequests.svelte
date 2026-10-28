<!-- The requests strip (agentAccess flag, D-027, D-034): under the header while any grant request
     is open, one row per request and its reason, with Allow and Refuse. Refuse opens a one-line optional note, then sends `deny`; Allow sends `grant`.
     With the accessByBot flag (rulings 320/321) the rows are grouped by the asking bot: a heading
     "<bot> asks for access to 3 containers", its rows (the container, or this board, and the reason)
     and, for a bot with more than one request, one Allow all, which sends one `grant` per request
     (the person's act, each through the act path); the strip's heading counts bots. Without the flag
     one row per request reads "<agent> asks to write in <container>" (or, for the whole board,
     "<agent> wants to draw on this board") under a count of requests.
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
  import { flagOn } from '#format';
  import type { AccessRequestRow } from './shell.svelte.ts';
  import { askWords, groupAskWords, groupByBot } from '../board/access/index.ts';
  import { pageFlags } from '../flags.ts';

  let { requests, onanswer, refusing = null, placement = 'board', scope = '', news = [], onallowall, byBot = flagOn('accessByBot', pageFlags()) }: {
    requests: AccessRequestRow[];
    /** Sends `grant` or `deny`; resolves true when it was recorded. */
    onanswer: (seq: number, answer: 'grant' | 'deny', text?: string) => Promise<boolean>;
    /** The request whose note is open (the gallery); the board opens it with Refuse. */
    refusing?: number | null;
    /** `board`: fixed under the header; `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
    /** Sends `grant` for each request of one bot and says so once (the board); resolves true when all were recorded. Without it (the gallery), `onanswer` is called for each. */
    onallowall?: (seqs: number[]) => Promise<boolean>;
    /** Told apart in element ids when a page holds more than one strip (the gallery). */
    scope?: string;
    /** The requests to announce, by line: those that arrived while the page was open. */
    news?: readonly number[];
    /** Group the rows by bot (the accessByBot flag, on unless the address turns it off). */
    byBot?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let open: number | null = $state(refusing);
  let note = $state('');
  /** The requests being answered now (one, or a whole bot's for Allow all). */
  let busy: number[] = $state([]);
  const groups = $derived(groupByBot(requests));
  const announce = $derived(byBot
    ? groups.filter((g) => g.asks.some((r) => news.includes(r.seq))).map((g) => `${g.name} ${groupAskWords(g)}`).join('. ')
    : requests.filter((r) => news.includes(r.seq)).map((r) => `${r.label} ${askWords(r)}`).join('. '));

  /** On the board the strip pushes the stage down by its height (board.css, --vb-strip-h), so
   * it never covers the top of the board; the property goes when the strip does. */
  let height = $state(0);
  $effect(() => {
    if (placement !== 'board') return;
    const root = document.documentElement.style;
    root.setProperty('--vb-strip-h', `${requests.length ? height : 0}px`);
    return () => root.removeProperty('--vb-strip-h');
  });

  const heading = $derived(shellAccessWords.askForAccess(byBot ? groups.length : requests.length));
  const idOf = (seq: number, part: string) => `${placement}${scope && `-${scope}`}-request-${seq}-${part}`;

  /** After an answer the row is gone: focus the next row's Allow, else the board. */
  async function refocus() {
    await tick();
    const next = document.querySelector<HTMLElement>(`[data-placement="${placement}"] .vb-access-allow`);
    (next ?? document.getElementById('stage'))?.focus();
  }

  async function answer(r: AccessRequestRow, a: 'grant' | 'deny', text?: string) {
    if (busy.length) return;
    busy = [r.seq];
    const ok = await onanswer(r.seq, a, text);
    busy = [];
    if (!ok) return;
    open = null;
    note = '';
    await refocus();
  }

  /** Allow every request of one bot, one `grant` each, stopping at the first that is not recorded. */
  async function allowAll(asks: readonly AccessRequestRow[]) {
    if (busy.length) return;
    busy = asks.map((r) => r.seq);
    let ok = true;
    if (onallowall) ok = await onallowall(asks.map((r) => r.seq));
    else for (const r of asks) if (ok) ok = await onanswer(r.seq, 'grant');
    busy = [];
    if (ok) await refocus();
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

{#snippet request(r: AccessRequestRow, name: string, grouped: boolean)}
  {@const where = r.container === undefined ? accessWords.drawOnThisBoard : accessWords.writeIn(r.container)}
  <li class="vb-access-row" data-request={r.seq} aria-busy={busy.includes(r.seq) ? 'true' : undefined}>
    <p class="vb-access-text">
      <span class="vb-access-ask">
        {#if grouped}<b>{r.container ?? shellAccessWords.thisBoard}</b>
        {:else}<b>{name}</b>
          {#if r.container === undefined}{shellAccessWords.wantsToDrawOn} <b>{shellAccessWords.thisBoard}</b>{:else}{shellAccessWords.asksToWriteIn2} <b>{r.container}</b>{/if}{/if}</span>
      <span class="vb-access-reason">{r.reason}</span>
    </p>
    {#if open === r.seq}
      <form class="vb-access-actions" onsubmit={(e) => { e.preventDefault(); void answer(r, 'deny', note.trim() || undefined); }}>
        <label class="vb-visually-hidden" for={idOf(r.seq, 'note')}>{shellAccessWords.noteForOptional(name)}</label>
        <input class="vb-access-note" id={idOf(r.seq, 'note')} type="text" maxlength="4000" autocomplete="off"
          placeholder={shellAccessWords.optionalWhyNot} bind:value={note} onkeydown={(e) => noteKey(e, r)} />
        <button type="submit" class="vb-btn vb-btn-small" aria-label={grouped ? shellAccessWords.refuseTo(name, where) : shellAccessWords.refuse(name)}>{shellAccessWords.refuse2}</button>
        <button type="button" class="vb-btn vb-btn-small" onclick={() => cancelRefuse(r)}>{shellCommonWords.cancel}</button>
      </form>
    {:else}
      <div class="vb-access-actions">
        <button type="button" class="vb-btn vb-btn-small vb-btn-primary vb-access-allow"
          aria-label={shellAccessWords.allowTo(name, where)} onclick={() => answer(r, 'grant')}>{shellAccessWords.allow}</button>
        <button type="button" class="vb-btn vb-btn-small" id={idOf(r.seq, 'refuse')}
          aria-label={grouped ? shellAccessWords.refuseTo(name, where) : shellAccessWords.refuse(name)} onclick={() => startRefuse(r)}>{shellAccessWords.refuse2}</button>
      </div>
    {/if}
  </li>
{/snippet}

{#if requests.length}
<section class="vb-access" data-placement={placement} aria-labelledby={idOf(0, 'title')} bind:offsetHeight={height}>
  <h2 class="vb-access-title" id={idOf(0, 'title')}>{heading}</h2>
  {#if byBot}
    <ul class="vb-access-list vb-access-groups">
      {#each groups as g (g.key)}
        <li class="vb-access-group" data-bot={g.key}>
          <div class="vb-access-bot">
            <h3 class="vb-access-bot-name" id={idOf(g.asks[0]!.seq, 'bot')}><b>{g.name}</b> {groupAskWords(g)}</h3>
            {#if g.asks.length > 1}
              <button type="button" class="vb-btn vb-btn-small vb-btn-primary vb-access-allow-all"
                aria-label={shellAccessWords.allowAllOf(g.name, g.asks.length)} onclick={() => allowAll(g.asks)}>{shellAccessWords.allowAll}</button>
            {/if}
          </div>
          <ul class="vb-access-list" aria-labelledby={idOf(g.asks[0]!.seq, 'bot')}>
            {#each g.asks as r (r.seq)}{@render request(r, g.name, true)}{/each}
          </ul>
        </li>
      {/each}
    </ul>
  {:else}
    <ul class="vb-access-list">
      {#each requests as r (r.seq)}{@render request(r, r.label, false)}{/each}
    </ul>
  {/if}
</section>
{/if}
<span class="vb-visually-hidden" id={idOf(0, 'announce')} aria-live="polite">{announce}</span>
