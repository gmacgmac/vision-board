<!-- The page's toast (shell.svelte.ts `toast`): a few words at the foot of the page that go by
     themselves. A plain one is an alert (`#toast`), as it always was. One with an action (the
     workAlongside flag's "The agent replied" with Open chat) is news, not an alert: it is said in a polite
     live region that is always in the page, so a screen reader hears it once it has finished what it
     is saying, and its button takes the action and closes it (`takeToast`). What the action does
     is also one click away elsewhere (the chat button), so missing the toast loses nothing. The
     gallery passes `toast` and `placement` 'gallery' to draw one in the page flow. -->
<script lang="ts">
  import type { Toast } from './shell.svelte.ts';
  import { shell, takeToast } from './shell.svelte.ts';

  let { toast, placement = 'board' }: { toast?: Toast | null; placement?: 'board' | 'gallery' } = $props();
  const shown = $derived(toast === undefined ? shell.toast : toast);
  const plain = $derived(shown && !shown.action ? shown : null);
  const acting = $derived(shown?.action ? shown : null);
</script>

<div id={placement === 'board' ? 'toast' : undefined} class="vb-toast" data-placement={placement} role="alert" hidden={!plain}
  data-tone={plain?.tone}>{plain?.text ?? ''}</div>
<div class="vb-toast-news" role="status">
  {#if acting?.action}
    <div id={placement === 'board' ? 'toast-news' : undefined} class="vb-toast" data-placement={placement} data-tone="info">
      <span>{acting.text}</span>
      <button type="button" class="vb-toast-act" onclick={() => (toast === undefined ? takeToast() : undefined)}>{acting.action.label}</button>
    </div>
  {/if}
</div>
