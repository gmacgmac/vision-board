<!-- The reply panel: the plain-text reply built from the person's responses on the board, ready to copy into chat. -->
<script lang="ts">
  import * as replyWords from './words/reply.ts';
  import * as shellCommonWords from './words/shell-common.ts';
  import { tick } from 'svelte';
  import { shell, toast } from './shell.svelte.ts';

  let text: HTMLElement;

  $effect(() => {
    if (shell.replyOpen) void tick().then(() => text.focus());
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(shell.replyText);
      toast(replyWords.replyCopied);
    } catch {
      toast(replyWords.copyFailedSelectTheText, 'error');
    }
  }
</script>

<aside id="reply" class="vb-reply" aria-label={replyWords.yourReply} hidden={!shell.replyOpen}>
  <header>
    <h2>{replyWords.yourReply}</h2>
    <button type="button" class="vb-btn vb-btn-primary" id="copy" onclick={copy}>{shellCommonWords.copy}</button>
    <button type="button" class="vb-btn" id="reply-close" aria-label={replyWords.closeReply}
      onclick={() => { shell.replyOpen = false; }}>✕</button>
  </header>
  <p class="vb-reply-hint">{replyWords.pasteItIntoChatOr} <code>{replyWords.nodeAppsBoardBinReply}</code>.</p>
  <!-- Focusable so keyboard users can scroll a long reply (WCAG 2.1.1). -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <pre id="reply-text" tabindex="0" bind:this={text}>{shell.replyText}</pre>
</aside>
