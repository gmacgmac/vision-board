<!-- The toolbar's Chat button (chatPanel flag; out of ToolbarEnd.svelte): opens and closes the chat
     sidebar, as T does. With the workAlongside flag (point 328) it is also the board's one mark of the
     chat's agent, so the person sees it at a glance while working on the board: "Agent working" with a
     dot that pulses (still under reduced motion) while its turn runs, "Waiting for your OK" with the
     attention dot while a question waits for the person (chat-news.ts `agentWork`, from the chat's own
     conditions), and "1 new" for replies that landed while the chat was closed or scrolled away
     (`createReplyNews`), until the person sees them. A narrow toolbar shows the icon with the dot and the
     number as badges; the words stay for screen readers. A question waiting is said politely. The
     gallery passes `work`, `news` and `placement` 'gallery' (no ids). -->
<script lang="ts">
  import * as chatWords from './words/chat.ts';
  import * as chromeCommonWords from '../board/words/chrome-common.ts';
  import * as toolbarWords from '../board/words/toolbar.ts';
  import { shell } from './shell.svelte.ts';
  import type { AgentWork } from './chat-news.ts';
  import { ButtonIcon } from '../board/chrome/index.ts';

  let { menu, work, news, placement = 'board' }: {
    /** The toolbarMenu flag: the tooltip names the key. */
    menu: boolean;
    /** The mark; left out, the page's (`shell.chatWork`). */
    work?: AgentWork;
    /** Replies not seen; left out, the page's (`shell.chatNews`). */
    news?: number;
    placement?: 'board' | 'gallery';
  } = $props();

  const board = $derived(placement === 'board');
  const mark = $derived(work ?? shell.chatWork);
  const count = $derived(news ?? shell.chatNews);
  const MARK: Record<Exclude<AgentWork, 'idle'>, string> = { working: chatWords.agentWorking, asking: chatWords.waitingForYourOk };
</script>

<button type="button" class="vb-btn vb-btn-iconic vb-chat-btn" id={board ? 'chat-toggle' : undefined}
  title={menu ? toolbarWords.openOrCloseTheChat : 'Chat · T'} aria-keyshortcuts="t" aria-expanded={board ? shell.chatOpen : false}
  aria-controls={board ? 'chat' : undefined} data-work={mark === 'idle' ? undefined : mark}
  onclick={() => { if (board) shell.chatOpen = !shell.chatOpen; }}>
  <ButtonIcon name="chat" /><span class="vb-btn-text">{toolbarWords.chat}</span>
  {#if mark !== 'idle'}
    <span class="vb-chat-mark"><span class="vb-chat-dot" aria-hidden="true"></span><span class="vb-chat-mark-word">{MARK[mark]}</span></span>
  {/if}
  {#if count > 0}
    <span class="vb-chat-news">{count}<span class="vb-chat-news-word">{` ${chromeCommonWords.newWord}`}</span></span>
  {/if}
</button>
{#if board}
  <span class="vb-visually-hidden" role="status">{mark === 'asking' ? chatWords.theAgentIsWaitingFor : ''}</span>
{/if}
