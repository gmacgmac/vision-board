<!-- A control the standalone page draws in the board's header (`BoardPageParts`, host.ts): an element that
     takes no room of its own (board.css `.vb-part`), which the page draws into. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import type { PagePart, PagePartArgs } from '../host.ts';

  let { draw, args = {} }: { draw: PagePart; args?: PagePartArgs } = $props();
</script>

<span class="vb-part" {@attach (el) => untrack(() => draw(el, args))}></span>
