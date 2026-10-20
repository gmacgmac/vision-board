<!-- The toolbar's "N open" chip (open-list FE_01, openList flag). While any card is open it is a menu
     dropdown over the chip (MenuSelect, the Containers finder's pattern): its list holds the open
     cards as "12 · title" in board order (board/finder.ts `openRow`), and choosing one goes to it as
     Go to card does (board/go-to-card.ts `to`). With nothing open (or `cards` empty: the flag off) it
     is the plain chip. The count stays on a narrow toolbar, the word for screen readers (board.css).
     The toolbar and the gallery both draw this. -->
<script lang="ts">
  import MenuSelect from './MenuSelect.svelte';
  import { openRow } from '../board/finder.ts';
  import type { OpenCard } from '../../../../packages/actions/src/index.ts';

  let { count, cards, onpick, id = 'open-cards', look }: {
    count: number;
    /** The open cards to list, by board number; none draws the plain chip. */
    cards: readonly OpenCard[];
    /** Go to card `n`. */
    onpick: (n: number) => void;
    id?: string;
    /** A state drawn without the pointer or keys: the gallery's samples only (MenuSelect). */
    look?: 'hover' | 'focus' | 'pressed';
  } = $props();

  const rows = $derived(cards.map(openRow));
</script>

{#snippet face()}<b>{count}</b> <span class="vb-chip-word">open</span>{/snippet}

{#if rows.length}
  <MenuSelect {id} label="Go to an open card" name="{count} open" {rows} onpick={(v) => onpick(Number(v))}
    {face} {look} tone="open" title="Open items: choose one to go to it" />
{:else}
  <span class="vb-chip" data-tone="open" title="Open items">{@render face()}</span>
{/if}
