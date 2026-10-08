<!-- The proposals bar (proposals flag, FE_01 ruling 4, mockup 03 "Board level"): in the requests
     strip's place and style, under it when both show, while the agent has proposals open on the
     board: "3 proposals from the agent · 1 out of date", Review (the first card's box) and Accept
     all, which lists what it applies before it does (proposal-flow.ts). A region landmark with a
     heading; a polite live region, always present so it is heard, announces the proposals in
     `news`: those that arrived in the page's latest batch (board/attention.ts). Off while a past
     version shows: the page passes no rows. -->
<script lang="ts">
  import type { ProposalRow } from '../board/proposals.ts';
  import { acceptAllPlan, barWords } from '../board/proposals.ts';

  let { rows, news = [], onreview, onacceptall, placement = 'board' }: {
    rows: readonly ProposalRow[];
    /** The proposals to announce, by line: those that arrived while the page was open. */
    news?: readonly number[];
    onreview: () => void;
    onacceptall: () => void;
    /** `board`: fixed under the header (and the requests strip); `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
  } = $props();

  const words = $derived(barWords(rows));
  const ready = $derived(acceptAllPlan(rows).apply.length);
  const announce = $derived(rows.filter((r) => news.includes(r.seq)).map((r) => `${r.agent ?? 'The agent'} proposes: ${r.reason}, on item ${r.n}`).join('. '));
  const title = $derived(`${placement}-proposals-title`);

  /** On the board the bar pushes the stage down by its height (board.css, --vb-proposals-h). */
  let height = $state(0);
  $effect(() => {
    if (placement !== 'board') return;
    const root = document.documentElement.style;
    root.setProperty('--vb-proposals-h', `${rows.length ? height : 0}px`);
    return () => root.removeProperty('--vb-proposals-h');
  });
</script>

{#if rows.length}
<section class="vb-access vb-proposals" data-placement={placement} aria-labelledby={title} bind:offsetHeight={height}>
  <h2 class="vb-access-title" id={title}>{words.count}</h2>
  {#if words.stale}<p class="vb-proposals-stale">· {words.stale}</p>{/if}
  <div class="vb-access-actions">
    <button type="button" class="vb-btn vb-btn-small" onclick={onreview}>Review</button>
    {#if ready}
      <button type="button" class="vb-btn vb-btn-small vb-btn-primary" onclick={onacceptall}>Accept all ({ready})</button>
    {/if}
  </div>
</section>
{/if}
<span class="vb-visually-hidden" aria-live="polite">{announce}</span>
