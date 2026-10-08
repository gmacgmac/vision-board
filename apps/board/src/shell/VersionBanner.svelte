<!-- The past-version banner (navigation FE_01 ruling 4, versionView flag): under the toolbar while a
     past version of the open board shows, "Viewing v42 from <time> · read-only" and Back to now (Esc
     does the same, board/controller.ts). Its text is a status, so it is announced when it appears.
     On the board it pushes the stage down by its height (--vb-banner-h, board.css), as the requests
     strip does with its own; the strip is not shown meanwhile. The gallery mounts it in the page flow. -->
<script lang="ts">
  import type { BoardRun } from '../../../../packages/actions/src/index.ts';
  import { versionTime } from '../board/versions.ts';

  let { run, onback, placement = 'board' }: {
    run: BoardRun;
    onback: () => void;
    /** `board`: fixed under the header; `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
  } = $props();

  let height = $state(0);
  $effect(() => {
    if (placement !== 'board') return;
    const root = document.documentElement.style;
    root.setProperty('--vb-banner-h', `${height}px`);
    return () => root.removeProperty('--vb-banner-h');
  });
</script>

<section class="vb-banner" data-placement={placement} aria-label="Past version" bind:offsetHeight={height}>
  <p class="vb-banner-text" role="status">Viewing <b>v{run.seq}</b> from {versionTime(run.at)} · read-only</p>
  <button type="button" class="vb-btn vb-btn-small" aria-keyshortcuts="Escape" onclick={onback}>Back to now</button>
</section>
