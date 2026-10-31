<!-- The toolbar's end group (the page's Theme and Chat, `BoardPageParts`): the zoom group (one command table, board/input/commands.ts; the zoom level
     shows beside Fit, ZoomLevel, and the buttons' tooltips say it too, N13), then the board-wide
     buttons. With the toolbarMenu flag (`menu`): Agents and Send to agent (agentAccess flag, when
     `holders` is given), Chat (chatPanel flag) and the "⋯" menu holding Theme, Hide answered and
     Reply (ToolbarMenu); a narrow toolbar (`[data-narrow]`, Toolbar.svelte) shows Agents, Send and
     Chat as icons, their words kept for screen readers and the title tooltip. Off: Hide answered,
     Theme and Reply as buttons, which a narrow toolbar shows as icons, as before. With `onarchive` (the
     archiveBoard flag) the menu has Archive board…, and with `onlock` (lockBoard flag) Lock board or Unlock board. The gallery
     passes `placement` 'gallery' (no board ids) and `menuOpen`. With `tier` (adaptiveHeader flag,
     header-tier.ts) the group follows the header's form: at full − 47% + then Fit; at half the zoom as a
     small menu (ZoomMenu); at a third no zoom and no Agents, which are rows of "⋯" (`fields`). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as commonWords from '../words/common.ts';
  import * as toolbarWords from '../words/toolbar.ts';
  import { useChrome, type SendState } from './chrome.svelte.ts';
  import SendButton from './SendButton.svelte';
  import BoardAgents from './BoardAgents.svelte';
  import ButtonIcon from './ButtonIcon.svelte';
  import PagePart from './PagePart.svelte';
  import ZoomLevel from './ZoomLevel.svelte';
  import ZoomMenu from './ZoomMenu.svelte';
  import ToolbarMenu from './ToolbarMenu.svelte';
  import { inBar, type HeaderTier } from './header-tier.ts';
  import { commandTitle, HEADER_COMMANDS, zoomTitle } from '../input/index.ts';
  import type { CommandId } from '../input/index.ts';
  import type { AccessHolder } from '#actions';
  import { LOCKED_PERSON } from '#actions';

  const { state: shown, parts, flag, id: idIn, ids } = useChrome();

  let { oncommand, onhide, onsend, onrevoke, onarchive, onlock, holders, menu, zoom, placement = 'board', menuOpen = false, tier, fields, also, folderAbove = false, zoomOpen = false, look, send }: {
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
    /** The toolbarMenu flag. */
    menu: boolean;
    /** The zoom to show, as a whole percentage; left out, the board's. The gallery passes its own. */
    zoom?: number;
    placement?: 'board' | 'gallery';
    menuOpen?: boolean;
    /** The header's form (adaptiveHeader flag); left out, the toolbar as it was. */
    tier?: HeaderTier | undefined;
    /** What moved into "⋯" at this form (ToolbarMenu). */
    fields?: Snippet<[(run: () => void) => void]> | undefined;
    also?: readonly string[] | undefined;
    folderAbove?: boolean;
    /** Draw the zoom menu open, or its button in a state: the gallery's samples only. */
    zoomOpen?: boolean;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
    /** The state Send draws (the gallery's). */
    send?: SendState | undefined;
  } = $props();

  const board = $derived(placement === 'board');
  const percent = $derived(zoom ?? shown.zoom);
  /** A control's id: none on a gallery's sample. */
  const idOf = (name: string) => (board ? idIn(name) : undefined);
  /** Send queues while the chat's agent works (workAlongside flag, point 328). */
  const queue = flag('chatPanel') && flag('workAlongside');
  /** At full the level sits between − and +, Fit after them; as it was, the level is beside Fit. */
  const order = $derived(tier ? (['zoom-out', 'zoom-in', 'fit'] as const) : HEADER_COMMANDS);
  const levelAfter = $derived(tier ? 'zoom-out' : 'fit');
  const here = (c: 'zoom' | 'agents') => !tier || inBar(tier, c);
</script>

<div class="vb-toolbar-end">
  {#if tier === 'half'}<span class="vb-bar-rule" aria-hidden="true"></span>{/if}
  {#if tier === 'half'}
    <ZoomMenu {percent} {oncommand} id={idOf('zoom-menu')} {ids} open={zoomOpen} {look} />
  {:else if here('zoom')}
    <div class="vb-zoom" role="group" aria-label={commonWords.zoom}>
      {#each order as id (id)}
        <button type="button" class="vb-btn" title={zoomTitle(id, percent)} aria-label={commandTitle(id).split(' · ')[0]}
          onclick={() => oncommand(id)}>{id === 'fit' ? commonWords.fit : id === 'zoom-out' ? '−' : '+'}</button>
        {#if id === levelAfter}<ZoomLevel {percent} />{/if}
      {/each}
    </div>
  {:else}
    <ZoomLevel {percent} level={false} />
  {/if}
  {#if !menu}
    <button type="button" class="vb-btn vb-btn-iconic" id={idOf('hide')} aria-pressed={shown.hide} title={toolbarWords.hideAnsweredItemsH}
      onclick={onhide}><ButtonIcon name="hide" /><span class="vb-btn-text">{commonWords.hideAnswered}</span></button>
    {#if parts.theme}<PagePart draw={parts.theme} />{/if}
    <button type="button" class="vb-btn vb-btn-primary vb-btn-iconic" id={idOf('reply-toggle')} title={toolbarWords.reply} aria-expanded={shown.replyOpen}
      aria-controls={idOf('reply')} onclick={() => { shown.replyOpen = !shown.replyOpen; }}>
      <ButtonIcon name="reply" /><span class="vb-btn-text">{toolbarWords.reply2(shown.answered)}</span>
    </button>
  {/if}
  {#if holders}
    {#if here('agents')}<BoardAgents {holders} {onrevoke} icon={menu} />{/if}
    <SendButton {onsend} icon={menu} id={idOf('send')} state={board ? undefined : send ?? 'idle'} waiting={shown.sendWaiting} {queue} unsent={shown.unsent || shown.chatAttached}
      paused={board && shown.locked ? LOCKED_PERSON : undefined} />
  {/if}
  {#if parts.chat}<PagePart draw={parts.chat} />{/if}
  {#if menu}<ToolbarMenu {onhide} {onarchive} {onlock} {placement} open={menuOpen} {fields} {also} {folderAbove} />{/if}
</div>
