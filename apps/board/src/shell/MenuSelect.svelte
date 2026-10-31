<!-- A dropdown that is a menu (board/find/finder.ts): the toolbar's Containers finder and the "N open"
     chip's list of open cards (OpenChip, open-list FE_01). A native select, so its keys, list and
     screen reader reading are the browser's: it shows its name (the first row); choosing a row calls
     `onpick` with its value, and it shows its name again. A row's `title` is its tooltip (the whole
     text of a cut row). With `face` the select lies unseen over that face (board.css
     `.vb-menu-face`), so the face keeps its look and draws the hover, focus and pressed looks; `kind` is
     that look's class: a chip, a part of the header's path, a row of the "⋯" menu (adaptiveHeader flag). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { MenuRow } from '../board/find/index.ts';

  let { id, label, name, rows, onpick, face, kind = 'vb-chip', tone, title, look }: {
    id: string;
    /** The accessible name (aria-label). */
    label: string;
    /** The first row, which the select shows while nothing is chosen. */
    name: string;
    rows: readonly MenuRow[];
    onpick: (value: string) => void;
    /** What shows in place of the select (a chip's content); without it the select shows itself. */
    face?: Snippet;
    /** The face's look: its class. */
    kind?: string;
    /** The face's chip tone (board.css `.vb-chip[data-tone]`). */
    tone?: string;
    /** The face's tooltip. */
    title?: string;
    /** A state drawn without the pointer or keys (hover, focus, pressed): the gallery's samples only. */
    look?: 'hover' | 'focus' | 'pressed';
  } = $props();

  function pick(select: HTMLSelectElement) {
    if (select.value) onpick(select.value);
    select.value = '';
  }
</script>

<!-- The name is aria-label and each row's words its `label`, so the select adds no text to what holds
     it: the "N open" chip sits in the counts' live region (#counts), whose text stays the counts. -->
{#snippet menu(cls: string)}
  <select {id} class={cls} aria-label={label} value="" onchange={(e) => pick(e.currentTarget)}>
    <option value="" label={name}></option>
    {#each rows as r (r.value)}
      <option value={r.value} label={r.text} disabled={r.disabled} title={r.title}></option>
    {/each}
  </select>
{/snippet}

{#if face}
  <span class="{kind} vb-menu-face" data-tone={tone} data-look={look} {title}>{@render face()}{@render menu('vb-menu-over')}</span>
{:else}
  {@render menu('vb-select vb-select-menu')}
{/if}
