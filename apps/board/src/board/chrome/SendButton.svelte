<!-- Send to agent (agentAccess flag, api.md 16): the person's "I'm done, over to you". One
     accent button with every state of rule 4: idle, hover, focus, pressed (CSS), sending
     (aria-disabled with a spinner, so keyboard focus stays on it), sent (a brief "Sent"), and
     error (the problem's detail is in the error toast and the button's title), waiting (`waiting`:
     sent while the chat's agent was mid-turn, the answers go when its turn ends; then "Sent"; with
     `queue`, the workAlongside flag, it reads "Queued" and says the person's answers meanwhile go too), and
     disabled (`unsent` false: nothing answered since the last Send, conditions `board.unsent`; quiet,
     aria-disabled and still focusable, its title "Nothing new to send" the reason; `paused`, why it
     can't send at all, such as a locked board's "Locked: unlock to change it", shows the same way).
     With `icon` (toolbarMenu flag) it carries a bot with a send arrow, which a narrow window shows in
     place of the words (board.css); the spinner and the tick stand in for it while sending and sent. The
     gallery passes `state` and `look` to draw a state without acting. -->
<script lang="ts">
  import * as chromeSendWords from '../words/chrome-send.ts';
  import type { SendState } from './chrome.svelte.ts';
  import ButtonIcon from './ButtonIcon.svelte';

  let { onsend, state: forced, look, icon = false, waiting = false, queue = false, unsent = true, paused, id = 'send' }: {
    /** Its document id, when it is not a gallery's sample. */
    id?: string | undefined;
    /** Sends the act; resolves to null when it was recorded, else the problem's detail. */
    onsend?: () => Promise<string | null>;
    /** The person answered since the board's last Send (the status's `unsent`); false, there is nothing to send. */
    unsent?: boolean;
    /** Why nothing can be sent now (a locked board, N40 ruling 4); disabled, with this as its title. */
    paused?: string | undefined;
    /** The answers wait for the chat's agent to finish its turn (the status's `sendWaiting`). */
    waiting?: boolean;
    /** The workAlongside flag: waiting reads "Queued", the person keeps working and what they answer meanwhile goes with it. */
    queue?: boolean;
    state?: SendState;
    look?: 'hover' | 'focus' | 'pressed';
    icon?: boolean;
  } = $props();

  const TEXT: Record<SendState, string> = {
    idle: chromeSendWords.sendToAgent, sending: chromeSendWords.sending, sent: chromeSendWords.sent, error: chromeSendWords.notSentTryAgain, waiting: chromeSendWords.waitingForAgent,
    disabled: chromeSendWords.sendToAgent,
  };
  const label = (s: SendState) => (s === 'waiting' && queue ? chromeSendWords.queued : TEXT[s]);
  const WAIT_TIP = $derived(queue ? chromeSendWords.queuedGoesToThe : chromeSendWords.yourAnswersGoToThe);
  const NOTHING_TIP = chromeSendWords.nothingNewToSend;
  /** How long "Sent" and the error state show before the button is idle again. */
  const HOLD = { sent: 2200, error: 6000 };

  let live = $state<SendState>('idle');
  let detail = $state('');
  let timer = 0;
  const st: SendState = $derived(forced ?? (waiting && live !== 'sending' && live !== 'error' ? 'waiting' : live === 'idle' && (paused || !unsent) ? 'disabled' : live));
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
    if (st === 'sending' || st === 'disabled' || !onsend) return;
    clearTimeout(timer);
    live = 'sending';
    const problem = await onsend();
    detail = problem ?? '';
    live = problem === null ? 'sent' : 'error';
    timer = window.setTimeout(() => { live = 'idle'; }, problem === null ? HOLD.sent : HOLD.error);
  }
</script>

<button type="button" class="vb-btn vb-btn-primary vb-send" class:vb-btn-iconic={icon} id={forced ? undefined : id} data-state={st} data-look={look}
  aria-disabled={st === 'sending' || st === 'disabled' ? 'true' : undefined}
  title={st === 'error' && detail ? detail : st === 'waiting' ? WAIT_TIP : st === 'disabled' ? (paused ?? NOTHING_TIP) : chromeSendWords.tellTheAgentsYouAre}
  onclick={click}>
  {#if st === 'sending'}<span class="vb-spinner" aria-hidden="true"></span>{/if}
  {#if st === 'waiting'}<span class="vb-send-wait" aria-hidden="true"></span>{/if}
  {#if st === 'sent'}<span class="vb-send-mark" aria-hidden="true">✓</span>{/if}
  {#if icon && (st === 'idle' || st === 'error' || st === 'disabled')}<ButtonIcon name="send" />{/if}
  <span class:vb-btn-text={icon}>{label(st)}</span>
</button>
{#if !forced}
  <span class="vb-visually-hidden" role="status">{st === 'sent' ? chromeSendWords.sentToTheAgent : st === 'waiting' ? WAIT_TIP : ''}</span>
{/if}
