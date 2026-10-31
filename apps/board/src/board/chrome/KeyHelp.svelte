<!-- The key commands bubble (navigation FE_04, keyBubble flag): a round "?" at the board's bottom left;
     hover or focus lists every command, grouped Items, Selection, Board, View, from the one command
     table and the action registry (board/input/key-help.ts). The open rules are the shared hover tip
     (packages/ui/src/tip/hover-tip.ts, WCAG 1.4.13): it stays while the pointer is on it, Esc
     closes it. "?" (Shift+/) opens it from anywhere on the page but a text field. The gallery
     mounts it in the page flow, open. With the cardSearch flag, Board lists `/` (SEARCH_02): the go
     command's key, its own row since it finds a card by its words. -->
<script lang="ts">
  import * as chromeKeyHelpWords from '../words/chrome-key-help.ts';
  import * as chromeGoToCardWords from '../words/chrome-go-to-card.ts';
  import { onMount } from 'svelte';
  import { bindHoverTip } from '#ui';
  import { keyGroups } from '../input/index.ts';
  import { useChrome } from './chrome.svelte.ts';

  let { placement = 'board' }: { placement?: 'board' | 'gallery' } = $props();

  const uid = $props.id();
  const OPEN = 'data-keys-open';
  const { flag, parts, id, root, pageWide } = useChrome();
  const go = flag('goToCard');
  /** The search row, after Go to a card by its number (cardSearch flag). */
  const SEARCH_ROW = { id: 'other:search', label: chromeGoToCardWords.findACardByItsWords, keys: ['/'] };
  const groups = keyGroups({ chat: !!parts.chat, flag: flag('cardFlag'), remove: flag('personRemove'), go, app: flag('appCards') })
    .map((g) => (go && flag('cardSearch') ? { ...g, rows: g.rows.flatMap((r) => (r.id === 'command:go-to-card' ? [r, SEARCH_ROW] : [r])) } : g));
  let host: HTMLElement;
  let button: HTMLButtonElement;

  onMount(() => {
    const tip = bindHoverTip(host, { anchor: '.vb-keys-btn', tip: '.vb-keys-tip', group: ':host', attr: OPEN });
    if (placement === 'gallery') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select, dialog, [contenteditable]')) return;
      if (!pageWide && !root.contains(e.target as Node)) return; // under a host, a key outside the board is the host's
      e.preventDefault();
      if (host.hasAttribute(OPEN)) return tip.close();
      // Focus opens the tip; from a button that already has focus (after Esc), start again.
      button.blur();
      button.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
</script>

<div class="vb-keys" data-placement={placement} bind:this={host}>
  <button type="button" class="vb-keys-btn" bind:this={button} aria-label={chromeKeyHelpWords.keyCommands} aria-describedby={id(`vb-keys-list-${uid}`)} aria-keyshortcuts="Shift+/">?</button>
  <div class="vb-tip vb-keys-tip" id={id(`vb-keys-list-${uid}`)} role="tooltip">
    <div class="vb-keys-body">
    {#each groups as g (g.group)}
      <section class="vb-keys-group" aria-label={g.group}>
        <h2 class="vb-keys-head">{g.group}</h2>
        <dl class="vb-keys-list">
          {#each g.rows as r (r.id)}
            <div class="vb-keys-row" data-row={r.id}>
              <dt>{r.label}</dt>
              <dd>{#each r.keys as k, i (k)}{#if i}<span class="vb-keys-or"> / </span>{/if}<kbd>{k}</kbd>{/each}</dd>
            </div>
          {/each}
        </dl>
      </section>
    {/each}
    </div>
  </div>
</div>
