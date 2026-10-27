<!-- The zoom level (tracker N13): the board's zoom as a percentage in the toolbar's zoom group. The
     visible number follows every frame of a zoom and is hidden from screen readers; a polite status
     says it once the zoom has settled (a burst of key presses or a pinch is one announcement). Its
     width is fixed so the group does not shift as the digits change. -->
<script lang="ts">
  import * as toolbarWords from './words/toolbar.ts';
  /** Quiet time after the last change before the level is announced. */
  const SETTLE_MS = 600;

  let { percent }: { percent: number } = $props();

  let heard = $state('');
  let first = true;

  $effect(() => {
    const text = toolbarWords.zoom(percent);
    heard = ''; // so the same level, reached again, is announced again
    // The level the page opens at is not news; only a change is.
    if (first) { first = false; return; }
    const timer = window.setTimeout(() => { heard = text; }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  });
</script>

<span class="vb-zoom-level" aria-hidden="true">{percent}%</span>
<span class="vb-visually-hidden" role="status" aria-live="polite">{heard}</span>
