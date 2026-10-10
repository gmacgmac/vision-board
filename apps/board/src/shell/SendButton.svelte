<!-- Send to agent (agentAccess flag, api.md 16): the person's "I'm done, over to you". One
     accent button with every state of rule 4: idle, hover, focus, pressed (CSS), sending
     (aria-disabled with a spinner, so keyboard focus stays on it), sent (a brief "Sent"), and
     error (the problem's detail is in the error toast and the button's title), and waiting (`waiting`:
     sent while the chat's agent was mid-turn, the answers go when its turn ends; then "Sent"). With `icon`
     (toolbarMenu flag) it carries a bot with a send arrow, which a narrow window shows in place of
     the words (board.css); the spinner and the tick stand in for it while sending and sent. The
     gallery passes `state` and `look` to draw a state without acting. -->
<script lang="ts">
  import type { SendState } from './shell.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';

  let { onsend, state: forced, look, icon = false, waiting = false }: {
    /** Sends the act; resolves to null when it was recorded, else the problem's detail. */
    onsend?: () => Promise<string | null>;
    /** The answers wait for the chat's agent to finish its turn (shell `sendWaiting`). */
    waiting?: boolean;
    state?: SendState;
    look?: 'hover' | 'focus' | 'pressed';
    icon?: boolean;
  } = $props();

  const TEXT: Record<SendState, string> = {
    idle: 'Send to agent', sending: 'Sending…', sent: 'Sent', error: 'Not sent · try again', waiting: 'Waiting for agent',
  };
  const WAIT_TIP = 'Your answers go to the agent when it finishes this turn';
  /** How long "Sent" and the error state show before the button is idle again. */
  const HOLD = { sent: 2200, error: 6000 };

  let live = $state<SendState>('idle');
  let detail = $state('');
  let timer = 0;
  const st: SendState = $derived(forced ?? (waiting && live !== 'sending' && live !== 'error' ? 'waiting' : live));
  let held = false;
  // The wait ended: the answers went, so "Sent" shows a moment.
  $effect(() => {
    if (waiting) held = true;
    else if (held) {
      held = false;
      clearTimeout(timer);
      live = 'sent';
      timer = window.setTimeout(() => { live = 'idle'; }, HOLD.sent);
    }
  });

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
  title={st === 'error' && detail ? detail : st === 'waiting' ? WAIT_TIP : 'Tell the agents you are done: they read your answers next'}
  onclick={click}>
  {#if st === 'sending'}<span class="vb-spinner" aria-hidden="true"></span>{/if}
  {#if st === 'waiting'}<span class="vb-send-wait" aria-hidden="true"></span>{/if}
  {#if st === 'sent'}<span class="vb-send-mark" aria-hidden="true">✓</span>{/if}
  {#if icon && (st === 'idle' || st === 'error')}<ButtonIcon name="send" />{/if}
  <span class:vb-btn-text={icon}>{TEXT[st]}</span>
</button>
{#if !forced}
  <span class="vb-visually-hidden" role="status">{st === 'sent' ? 'Sent to the agent' : st === 'waiting' ? WAIT_TIP : ''}</span>
{/if}
