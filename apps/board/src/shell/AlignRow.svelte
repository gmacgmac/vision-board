<!-- The page's Centre cards (alignSetting flag, the viewer's alignment, field report batch 3 ruling 4): a
     checkbox row of the "⋯" menu, off by default, kept in this browser by align.ts. On, rows and columns of
     cards are centred; off, they line up by their tops and left edges. The board hears it as a setting. -->
<script lang="ts">
  import * as toolbarWords from '../board/words/toolbar.ts';
  import { ButtonIcon } from '../board/chrome/index.ts';
  import { keepAlign } from './align.ts';
  import { shell } from './shell.svelte.ts';

  let { choose, placement = 'board' }: { choose: (run: () => void) => void; placement?: 'board' | 'gallery' } = $props();

  function toggle() {
    shell.align = shell.align === 'center' ? 'start' : 'center';
    keepAlign(shell.align);
  }
</script>

<button type="button" class="vb-menu-item" role="menuitemcheckbox" tabindex="-1" id={placement === 'board' ? 'align' : undefined}
  aria-checked={shell.align === 'center'} title={toolbarWords.offARowOfCards} onclick={() => choose(toggle)}>
  <ButtonIcon name="align" /><span class="vb-menu-label">{toolbarWords.centreCards2}</span>
  <span class="vb-menu-check" aria-hidden="true">✓</span>
</button>
