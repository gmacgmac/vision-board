<!-- The toolbar's end group: the zoom group (one command table, board/input/commands.ts; the zoom level
     shows beside Fit, ZoomLevel, and the buttons' tooltips say it too, N13), then the board-wide
     buttons. With the toolbarMenu flag (`menu`): Agents and Send to agent (agentAccess flag, when
     `holders` is given), Chat (chatPanel flag) and the "⋯" menu holding Theme, Hide answered and
     Reply (ToolbarMenu); a narrow toolbar (`[data-narrow]`, Toolbar.svelte) shows Agents, Send and
     Chat as icons, their words kept for screen readers and the title tooltip. Off: Hide answered,
     Theme and Reply as buttons, which a narrow toolbar shows as icons, as before. With `onarchive` (the
     archiveBoard flag) the menu has Archive board…, and with `onlock` (lockBoard flag) Lock board or Unlock board. The gallery
     passes `placement` 'gallery' (no board ids) and `menuOpen`. -->
<script lang="ts">
  import * as commonWords from '../board/words/common.ts';
  import * as toolbarWords from './words/toolbar.ts';
  import { shell } from './shell.svelte.ts';
  import SendButton from './SendButton.svelte';
  import BoardAgents from './BoardAgents.svelte';
  import ButtonIcon from './ButtonIcon.svelte';
  import ChatButton from './ChatButton.svelte';
  import ZoomLevel from './ZoomLevel.svelte';
  import ToolbarMenu from './ToolbarMenu.svelte';
  import { commandTitle, HEADER_COMMANDS, zoomTitle } from '../board/input/index.ts';
  import type { CommandId } from '../board/input/index.ts';
  import type { AccessHolder } from '#actions';
  import { LOCKED_PERSON } from '#actions';

  let { theme, ontheme, oncommand, onhide, onsend, onrevoke, onarchive, onlock, holders, chat, menu, zoom, placement = 'board', menuOpen = false }: {
    theme: string;
    ontheme: () => void;
    oncommand: (id: CommandId) => void;
    onhide: () => void;
    onsend: () => Promise<string | null>;
    onrevoke: (agent: string) => Promise<void>;
    /** Archive board… in the "⋯" menu (archiveBoard flag); left out, no such row. */
    onarchive?: (() => void) | undefined;
    /** Lock board or Unlock board in the "⋯" menu (lockBoard flag); left out, no such row. */
    onlock?: (() => void) | undefined;
    /** The board's holders, when Agents and Send to agent show; null hides both. */
    holders: AccessHolder[] | null;
    chat: boolean;
    /** The toolbarMenu flag. */
    menu: boolean;
    /** The zoom to show, as a whole percentage; left out, the board's (`shell.zoom`). The gallery passes its own. */
    zoom?: number;
    placement?: 'board' | 'gallery';
    menuOpen?: boolean;
  } = $props();

  const board = $derived(placement === 'board');
  const percent = $derived(zoom ?? shell.zoom);
</script>

<div class="vb-toolbar-end">
  <div class="vb-zoom" role="group" aria-label={commonWords.zoom}>
    {#each HEADER_COMMANDS as id (id)}
      <button type="button" class="vb-btn" title={zoomTitle(id, percent)} aria-label={commandTitle(id).split(' · ')[0]}
        onclick={() => oncommand(id)}>{id === 'fit' ? commonWords.fit : id === 'zoom-out' ? '−' : '+'}</button>
      {#if id === 'fit'}<ZoomLevel {percent} />{/if}
    {/each}
  </div>
  {#if !menu}
    <button type="button" class="vb-btn vb-btn-iconic" id="hide" aria-pressed={shell.hide} title={toolbarWords.hideAnsweredItemsH}
      onclick={onhide}><ButtonIcon name="hide" /><span class="vb-btn-text">{commonWords.hideAnswered}</span></button>
    <button type="button" class="vb-btn vb-btn-iconic" id="theme" title={toolbarWords.theme(theme)} onclick={ontheme}>
      <ButtonIcon name="theme" /><span class="vb-btn-text">{toolbarWords.theme(theme)}</span>
    </button>
    <button type="button" class="vb-btn vb-btn-primary vb-btn-iconic" id="reply-toggle" title={toolbarWords.reply} aria-expanded={shell.replyOpen}
      aria-controls="reply" onclick={() => { shell.replyOpen = !shell.replyOpen; }}>
      <ButtonIcon name="reply" /><span class="vb-btn-text">{toolbarWords.reply2(shell.answered)}</span>
    </button>
  {/if}
  {#if holders}
    <BoardAgents {holders} {onrevoke} icon={menu} />
    <SendButton {onsend} icon={menu} state={board ? undefined : 'idle'} waiting={shell.sendWaiting} queue={shell.workAlongside} unsent={shell.unsent || shell.chatAttached}
      paused={board && shell.locked ? LOCKED_PERSON : undefined} />
  {/if}
  {#if chat}
    <ChatButton {menu} {placement} />
  {/if}
  {#if menu}<ToolbarMenu {theme} {ontheme} {onhide} {onarchive} {onlock} {placement} open={menuOpen} />{/if}
</div>
