<!-- The proposals notice (proposals flag; FE_01 ruling 4, proposals-notice rulings 1-5): while the
     agent has proposals open on the board, a see-through notice floats over the board's top left,
     under the requests strip when it shows; it pushes nothing down. Three stacked rows: "3 proposals · 1 out
     of date" with Hide at the end, Review, and Accept all, which lists what it
     applies before it does (proposal-flow.ts). With reviewList flag and proposals on more than one card,
     Review is a menu dropdown (MenuSelect, the open list's pattern) of those cards as "12 · title · what
     it proposes" in card order; choosing one goes to the card and opens its box. One card: Review goes straight to it. Hide, or Esc in the notice, collapses it to a pill in
     the same place (just the number, "3"), which brings it back; the choice is kept per viewer (shell/kept.ts).
     Page polish: the number (.vb-proposals-n) sits at the same spot in the pill and in the notice, so
     opening only grows the box down and to the right (proposals.css).
     A region landmark; a polite live region, always present so it is heard (the pill too), announces
     the proposals in `news`: those that arrived in the page's latest batch (board/cards/attention.ts).
     Off while a past version shows: the page passes no rows. -->
<script lang="ts">
  import * as shellProposalsWords from './words/shell-proposals.ts';
  import { tick } from 'svelte';
  import type { ProposalRow } from '#actions';
  import { acceptAllPlan } from '#actions';
  import { barWords, proposes } from '../board/cards/index.ts';
  import { reviewRows } from '../board/find/index.ts';
  import MenuSelect from './MenuSelect.svelte';
  import { keep, kept } from './kept.ts';

  let { rows, news = [], onreview, onacceptall, placement = 'board', collapsed = false, look }: {
    rows: readonly ProposalRow[];
    /** The proposals to announce, by line: those that arrived while the page was open. */
    news?: readonly number[];
    /** Review: card `n`, chosen from the list; none, the first card with a proposal. */
    onreview: (n?: number) => void;
    onacceptall: () => void;
    /** `board`: floating over the board's top left; `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
    /** The gallery's pill sample; on the board the viewer's kept choice decides. */
    collapsed?: boolean;
    /** Review's list drawn in a state without the pointer or keys: the gallery's samples only (MenuSelect). */
    look?: 'hover' | 'focus' | 'pressed';
  } = $props();

  const HIDDEN_KEY = 'vb.proposals-hidden';
  const onBoard = () => placement === 'board';
  const words = $derived(barWords(rows));
  const ready = $derived(acceptAllPlan(rows).apply.length);
  const announce = $derived(rows.filter((r) => news.includes(r.seq)).map((r) => shellProposalsWords.proposesOnItem(r.agent ?? shellProposalsWords.theAgent, r.reason, r.n)).join('. '));
  const title = $derived(`${placement}-proposals-title`);
  /** Review's list (board/find/finder.ts `reviewRows`): empty without titles (the reviewList flag) or with one card. */
  const list = $derived(reviewRows(rows, proposes));

  const start = () => (onBoard() ? kept(HIDDEN_KEY) === '1' : collapsed);
  let hidden = $state(start());
  let pill: HTMLButtonElement | undefined = $state();
  let review: HTMLButtonElement | undefined = $state();

  /** Hide or show the notice; focus goes to what took its place (the pill, or Review). */
  async function show(on: boolean) {
    hidden = !on;
    if (onBoard()) keep(HIDDEN_KEY, on ? '0' : '1');
    await tick();
    (on ? review ?? document.getElementById(`${placement}-review`) : pill)?.focus();
  }

  function onkey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || hidden) return;
    e.preventDefault();
    void show(false);
  }
</script>

{#snippet face()}{shellProposalsWords.review}{/snippet}

{#if rows.length}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="vb-proposals" data-placement={placement} data-hidden={hidden || undefined}
  aria-labelledby={hidden ? undefined : title} aria-label={hidden ? words.count : undefined} onkeydown={onkey}>
  {#if hidden}
    <button type="button" class="vb-proposals-pill" aria-label={shellProposalsWords.showTheNotice(words.count)} title={shellProposalsWords.showTheProposalsNotice}
      bind:this={pill} onclick={() => show(true)}><span class="vb-proposals-n">{words.n}</span></button>
  {:else}
    <div class="vb-proposals-head">
      <div class="vb-proposals-text">
        <h2 class="vb-proposals-title" id={title}><span class="vb-proposals-n">{words.n}</span> {words.noun}</h2>
        {#if words.stale}<p class="vb-proposals-stale">· {words.stale}</p>{/if}
      </div>
      <button type="button" class="vb-proposals-hide" aria-label={shellProposalsWords.hideTheProposalsNotice} title={shellProposalsWords.hideEsc}
        onclick={() => show(false)}><span class="vb-proposals-chevron" aria-hidden="true"></span></button>
    </div>
    {#if list.length}
      <MenuSelect id="{placement}-review" label={shellProposalsWords.reviewACardWithAProposal} name={shellProposalsWords.review} rows={list}
        onpick={(v) => onreview(Number(v))} {face} {look} title={shellProposalsWords.reviewChooseOneTo} />
    {:else}
      <button type="button" class="vb-btn vb-btn-small" bind:this={review} onclick={() => onreview()}>{shellProposalsWords.review}</button>
    {/if}
    {#if ready}
      <button type="button" class="vb-btn vb-btn-small vb-btn-primary" onclick={onacceptall}>{shellProposalsWords.acceptAll(ready)}</button>
    {/if}
  {/if}
</section>
{/if}
<span class="vb-visually-hidden" aria-live="polite">{announce}</span>
