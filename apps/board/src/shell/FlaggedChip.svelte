<!-- The toolbar's "N flagged" chip (cardFlag flag, board/cards/flag-flow.ts): a chip that is a button. A
     press focuses the next flagged card, in number order from the focused one, wrapping; the board
     pans it into view. Its words are "N flagged" (the count stays on a narrow toolbar, the word for
     screen readers); the title says what a press does. The toolbar and the gallery both draw this. -->
<script lang="ts">
  import ButtonIcon from './ButtonIcon.svelte';
  import { flaggedWords } from '../board/cards/index.ts';

  let { count, onclick, id }: { count: number; onclick: () => void; id?: string } = $props();
  const words = $derived(flaggedWords(count));
</script>

<button type="button" {id} class="vb-chip vb-chip-btn" data-tone="flag" title={words.title} {onclick}>
  <ButtonIcon name="flag" /><b>{words.count}</b> <span class="vb-chip-word">{words.word}</span>
</button>
