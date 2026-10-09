<!-- Send to agent (agentAccess flag, api.md 16): the person's "I'm done, over to you". One
     accent button with every state of rule 4: idle, hover, focus, pressed (CSS), sending
     (aria-disabled with a spinner, so keyboard focus stays on it), sent (a brief "Sent"), and
     error (the problem's detail is in the error toast and the button's title). With `icon`
     (toolbarMenu flag) it carries a bot with a send arrow, which a narrow window shows in place of
     the words (board.css); the spinner and the tick stand in for it while sending and sent. The
     gallery passes `state` and `look` to draw a state without acting. -->
<script lang="ts">
  import type { SendState } from './shell.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';

  let { onsend, state: forced, look, icon = false }: {
    /** Sends the act; resolves to null when it was recorded, else the problem's detail. */
    onsend?: () => Promise<string | null>;
    state?: SendState;
    look?: 'hover' | 'focus' | 'pressed';
    icon?: boolean;
  } = $props();

  const TEXT: Record<SendState, string> = {
    idle: 'Send to agent', sending: 'Sending…', sent: 'Sent', error: 'Not sent · try again',
  };
  /** How long "Sent" and the error state show before the button is idle again. */
  const HOLD = { sent: 2200, error: 6000 };

  let live: SendState = $state('idle');
  let detail = $state('');
  let timer = 0;
  const st = $derived(forced ?? live);

  async function click() {
    if (st === 'sending' || !onsend) return;
    clearTimeout(timer);
    live = 'sending';
    const problem = await onsend();
    detail = problem ?? '';
    live = problem === null ? 'sent' : 'error';
    timer = window.setTimeout(() => { live = 'idle'; }, problem === null ? HOLD.sent : HOLD.error);
  }
</script>

<button type="button" class="vb-btn vb-btn-primary vb-send" class:vb-btn-iconic={icon} id={forced ? undefined : 'send'} data-state={st} data-look={look}
  aria-disabled={st === 'sending' ? 'true' : undefined}
  title={st === 'error' && detail ? detail : 'Tell the agents you are done: they read your answers next'}
  onclick={click}>
  {#if st === 'sending'}<span class="vb-spinner" aria-hidden="true"></span>{/if}
  {#if st === 'sent'}<span class="vb-send-mark" aria-hidden="true">✓</span>{/if}
  {#if icon && (st === 'idle' || st === 'error')}<ButtonIcon name="send" />{/if}
  <span class:vb-btn-text={icon}>{TEXT[st]}</span>
</button>
{#if !forced}
  <span class="vb-visually-hidden" role="status">{st === 'sent' ? 'Sent to the agent' : ''}</span>
{/if}
