<!-- The page's Theme (host.ts `BoardPageParts`): a row of the "⋯" menu, given `choose`; else a button in the
     end group (toolbarMenu flag off). The gallery passes `placement` 'gallery', which drops the id. -->
<script lang="ts">
  import * as toolbarWords from '../board/words/toolbar.ts';
  import { ButtonIcon } from '../board/chrome/index.ts';
  import { shell } from './shell.svelte.ts';
  import { nextTheme } from './theme.ts';

  let { choose, placement = 'board', theme }: {
    choose?: ((run: () => void) => void) | undefined;
    placement?: 'board' | 'gallery';
    /** The theme to name (the gallery's); left out, the page's. */
    theme?: string;
  } = $props();
  const word = $derived(toolbarWords.theme(theme ?? shell.theme));
  const id = $derived(placement === 'board' ? 'theme' : undefined);
  const next = () => { shell.theme = nextTheme(shell.theme); };
</script>

{#if choose}
  <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" {id} onclick={() => choose(next)}>
    <ButtonIcon name="theme" /><span class="vb-menu-label">{word}</span>
  </button>
{:else}
  <button type="button" class="vb-btn vb-btn-iconic" {id} title={word} onclick={next}>
    <ButtonIcon name="theme" /><span class="vb-btn-text">{word}</span>
  </button>
{/if}
