<!-- The reply panel: the plain-text reply built from the person's responses on the board, ready to copy into chat. -->
<script lang="ts">
  import * as replyWords from '../words/reply.ts';
  import * as chromeCommonWords from '../words/chrome-common.ts';
  import { tick } from 'svelte';
  import { useChrome } from './chrome.svelte.ts';

  const { state: shown, id, notify, root, help } = useChrome();
  let text: HTMLElement;
  let panel: HTMLElement;

  $effect(() => {
    if (shown.replyOpen) void tick().then(() => text.focus());
  });
  // Closing with the focus inside: it goes to the stage, so the next key still reaches the board.
  $effect.pre(() => {
    if (!shown.replyOpen && panel?.contains(document.activeElement)) root.querySelector<HTMLElement>(':scope > .vb-stage')?.focus({ preventScroll: true });
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown.replyText);
      notify(replyWords.replyCopied);
    } catch {
      notify(replyWords.copyFailedSelectTheText, 'error');
    }
  }
</script>

<aside id={id('reply')} class="vb-reply vb-surface-panel" bind:this={panel} aria-label={replyWords.yourReply} hidden={!shown.replyOpen}>
  <header>
    <h2>{replyWords.yourReply}</h2>
    <button type="button" class="vb-btn vb-btn-primary" id={id('copy')} onclick={copy}>{chromeCommonWords.copy}</button>
    <button type="button" class="vb-btn" id={id('reply-close')} aria-label={replyWords.closeReply}
      onclick={() => { shown.replyOpen = false; }}>✕</button>
  </header>
  <p class="vb-reply-hint">{#if help?.reply}{help.reply.lead} <code>{help.reply.command}</code>.{:else}{replyWords.pasteItIntoChat}{/if}</p>
  <!-- Focusable so keyboard users can scroll a long reply (WCAG 2.1.1). -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <pre id={id('reply-text')} tabindex="0" bind:this={text}>{shown.replyText}</pre>
</aside>
