<!-- The version dropdown (versionView flag, navigation FE_01): the open board's own versions, "now" first,
     then each past one with its time (board/boards/versions.ts); choosing one shows the board as it was,
     read-only (VersionBanner). With `face` (adaptiveHeader flag) the select lies unseen over that face
     (board.css `.vb-menu-face`): the bar's "v37" or the "⋯" menu's row, `kind` its look. Toolbar.svelte and
     HeaderFields.svelte draw this. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as toolbarWords from './words/toolbar.ts';
  import { versionTime } from '#ui';
  import type { shell } from './shell.svelte.ts';

  let { facts, onversion, id, face, kind = 'vb-path-part', onpicked, look }: {
    facts: typeof shell;
    /** Show a past version of the open board, or now with null. */
    onversion: (seq: number | null) => Promise<void>;
    id: string;
    face?: Snippet | undefined;
    kind?: string;
    /** After a choice: the "⋯" menu closes. */
    onpicked?: ((run: () => void) => void) | undefined;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
  } = $props();

  /** Pick a version; the dropdown then shows what is on show (a failed read leaves the board as it was). */
  async function pick(select: HTMLSelectElement) {
    await onversion(select.value === 'now' ? null : Number(select.value));
    select.value = String(facts.past?.seq ?? 'now');
  }
  const change = (select: HTMLSelectElement) => (onpicked ? onpicked(() => void pick(select)) : void pick(select));
</script>

{#snippet picker(cls: string)}
  <label class="vb-visually-hidden" for={id}>{toolbarWords.version}</label>
  <select {id} class={cls} value={String(facts.past?.seq ?? 'now')} aria-busy={facts.loadingVersion} onchange={(e) => change(e.currentTarget)}>
    <option value="now">{toolbarWords.vNow(facts.version ?? 0)}</option>
    {#each facts.versions as v (v.seq)}
      <option value={String(v.seq)}>v{v.seq} · {versionTime(v.at)}</option>
    {/each}
  </select>
{/snippet}

{#if face}
  <span class="{kind} vb-menu-face" data-look={look} title={toolbarWords.version}>{@render face()}{@render picker('vb-menu-over')}</span>
{:else}
  {@render picker('vb-select')}
{/if}
