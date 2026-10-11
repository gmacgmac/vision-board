<!-- The key commands bubble (navigation FE_04, keyBubble flag): a round "?" at the board's bottom left;
     hover or focus lists every command, grouped Items, Selection, Board, View, from the one command
     table and the action registry (board/key-help.ts). The open rules are the shared hover tip
     (packages/ui/src/tip/hover-tip.ts, WCAG 1.4.13): it stays while the pointer is on it, Esc
     closes it. "?" (Shift+/) opens it from anywhere on the page but a text field. The gallery
     mounts it in the page flow, open. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { bindHoverTip } from '../../../../packages/ui/src/index.ts';
  import { keyGroups } from '../board/key-help.ts';
  import { flagOn } from '../../../../packages/format/src/index.ts';
  import { pageFlags } from '../flags.ts';

  let { placement = 'board' }: { placement?: 'board' | 'gallery' } = $props();

  const uid = $props.id();
  const OPEN = 'data-keys-open';
  const groups = keyGroups({ chat: flagOn('chatPanel', pageFlags()), flag: flagOn('cardFlag', pageFlags()) });
  let host: HTMLElement;
  let button: HTMLButtonElement;

  onMount(() => {
    const tip = bindHoverTip(host, { anchor: '.vb-keys-btn', tip: '.vb-keys-tip', group: ':host', attr: OPEN });
    if (placement === 'gallery') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select, dialog, [contenteditable]')) return;
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
  <button type="button" class="vb-keys-btn" bind:this={button} aria-label="Key commands" aria-describedby="vb-keys-list-{uid}" aria-keyshortcuts="Shift+/">?</button>
  <div class="vb-tip vb-keys-tip" id="vb-keys-list-{uid}" role="tooltip">
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
