<!-- The zoom level (tracker N13): the board's zoom as a percentage in the toolbar's zoom group. The
     visible number follows every frame of a zoom and is hidden from screen readers; a polite status
     says it once the zoom has settled (a burst of key presses or a pinch is one announcement). Its
     width is fixed so the group does not shift as the digits change. With `level` false (adaptiveHeader
     flag: the zoom's number is on a menu's face or in a row of "⋯", where a closed menu could not speak)
     only the status shows, so a zoom by keys is still said at every width of the bar. The level a board opens at
     (its first draw's fit or its kept place, and a switch to another board) is not news: only a change of the open
     board's level is (GATE3-R1: the opening fit filled the status 600ms after every page load). -->
<script lang="ts">
  import { untrack } from 'svelte';
  import * as toolbarWords from '../words/toolbar.ts';
  import { useChrome } from './chrome.svelte.ts';
  /** Quiet time after the last change before the level is announced. */
  const SETTLE_MS = 600;

  let { percent, level = true }: { percent: number; level?: boolean } = $props();

  const { state: shown } = useChrome();
  let heard = $state('');
  /** The board whose opening level was seen: its later changes are news. */
  let opened: string | null = null;

  $effect(() => {
    const text = toolbarWords.zoom(percent);
    const board = shown.boardId;
    heard = ''; // so the same level, reached again, is announced again
    // Before the first draw, and the level a board opens at (drawn with it, in the same turn), are not news.
    if (untrack(() => shown.drawn) === 0 || board !== opened) {
      if (untrack(() => shown.drawn) > 0) opened = board;
      return;
    }
    const timer = window.setTimeout(() => { heard = text; }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  });
</script>

{#if level}<span class="vb-zoom-level" aria-hidden="true">{percent}%</span>{/if}
<span class="vb-visually-hidden" role="status" aria-live="polite">{heard}</span>
