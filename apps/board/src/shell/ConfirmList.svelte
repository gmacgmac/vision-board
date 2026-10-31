<!-- What a confirm step does, listed (proposals FE_01 ruling 4, mockup 03 `.apply-list`): each card's
     number and what is done to it, in the order it is done, then under "Not included" what is left
     out and why. The confirm dialog shows it under its words; the gallery draws it on its own. -->
<script lang="ts">
  import * as chromeConfirmWords from '../board/words/chrome-confirm.ts';
  import type { ConfirmList } from './shell.svelte.ts';

  let { list }: { list: ConfirmList } = $props();
</script>

<ol class="vb-confirm-list">
  {#each list.items as it, i (i)}
    <li><span class="vb-nref" aria-hidden="true">{it.ref}</span><span class="vb-visually-hidden">{chromeConfirmWords.item(it.ref)}</span> {it.text}</li>
  {/each}
</ol>
{#if list.skipped?.length}
  <p class="vb-confirm-skip-title">{chromeConfirmWords.notIncluded}</p>
  <ul class="vb-confirm-list vb-confirm-skip">
    {#each list.skipped as it, i (i)}
      <li><span class="vb-nref" aria-hidden="true">{it.ref}</span><span class="vb-visually-hidden">{chromeConfirmWords.item(it.ref)}</span> {it.text}</li>
    {/each}
  </ul>
{/if}
