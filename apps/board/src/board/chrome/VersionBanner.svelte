<!-- The past-version banner (navigation FE_01 ruling 4, versionView flag): under the toolbar while a
     past version of the open board shows, "Viewing v42 from <time> · read-only" and Back to now (Esc
     does the same, board/controller.ts). Its text is a status, so it is announced when it appears.
     On the board it pushes the stage down by its height (--vb-banner-h, board.css), as the requests
     strip does with its own; the strip is not shown meanwhile. The gallery mounts it in the page flow. -->
<script lang="ts">
  import * as toolbarWords from '../words/toolbar.ts';
  import type { BoardRun } from '#actions';
  import { versionTime } from '#ui';

  let { run, onback, placement = 'board', root: where }: {
    /** Where it says its height: the board's root. */
    root?: HTMLElement;
    run: BoardRun;
    onback: () => void;
    /** `board`: fixed under the header; `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
  } = $props();

  let height = $state(0);
  $effect(() => {
    if (placement !== 'board' || !where) return;
    const root = where.style;
    root.setProperty('--vb-banner-h', `${height}px`);
    return () => root.removeProperty('--vb-banner-h');
  });
</script>

<section class="vb-banner" data-placement={placement} aria-label={toolbarWords.pastVersion} bind:offsetHeight={height}>
  <p class="vb-banner-text" role="status">{toolbarWords.viewing} <b>v{run.seq}</b> {toolbarWords.fromReadOnly(versionTime(run.at))}</p>
  <button type="button" class="vb-btn vb-btn-small" aria-keyshortcuts="Escape" onclick={onback}>{toolbarWords.backToNow}</button>
</section>
