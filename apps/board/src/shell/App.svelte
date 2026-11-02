<!-- The standalone page, one host of the board (board/mount.ts, host.ts; page-host.ts): the board's root fills it
     and holds the board's controls (board/chrome/), and the page keeps its own: the skip link, the chat sidebar
     (chatPanel flag), toast, the confirm dialog, the folder picker (openFolder flag) and the parts it draws in the
     board's header (page-parts.ts). -->
<script lang="ts">
  import * as chromeBoardWords from '../board/words/chrome-board.ts';
  import { onMount, tick, untrack } from 'svelte';
  import { mount, type MountedBoard } from '../board/mount.ts';
  import { exposeWork } from '../board/work.ts';
  import { askConfirm, shell, toast } from './shell.svelte.ts';
  import { createPageHost, guardLeave } from './page-host.ts';
  import { pageParts } from './page-parts.ts';
  import { applyTheme } from './theme.ts';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import ChatSidebar from './ChatSidebar.svelte';
  import FolderDialog from './FolderDialog.svelte';
  import Toast from './Toast.svelte';
  import * as chatWords from './words/chat.ts';
  import { createChatBridge } from './chat-bridge.ts';
  import { createChatPanel, type ChatPanel } from './chat-panel.ts';
  import { guardFileDrops } from './file-drops.ts';
  import { flagOn } from '#format';
  import { pageFlags } from '../flags.ts';

  /** The board's root: the page hosts the board in it (board/mount.ts), as nclite hosts it in a pane. */
  let root = $state<HTMLElement>();
  /** The skip link: it points at the board's stage, whose id the mount's prefix starts. */
  let skip = $state<HTMLAnchorElement>();
  let view = $state<MountedBoard | null>(null);
  /** The chat beside the board (chatPanel flag, chat-panel FE_02): the page's chat as the board's host gives it. */
  const bridge = createChatBridge();
  shell.chatPanel = flagOn('chatPanel', pageFlags());
  const host = createPageHost(bridge.host, pageParts());
  const openFolder = flagOn('openFolder', pageFlags());
  /** A tab close, a reload and another folder ask while a note holds unsaved words (M11). */
  const leavePrompt = flagOn('leavePrompt', pageFlags());
  /** Working alongside the agent (workAlongside flag, point 328): the chat button's mark and count, Send queued, a reply announced. */
  shell.workAlongside = shell.chatPanel && flagOn('workAlongside', pageFlags());
  const alongside = shell.workAlongside ? {
    isOpen: () => shell.chatOpen,
    news: (n: number) => { shell.chatNews = n; },
    announce: (open: () => void) => toast(chatWords.theAgentReplied, 'info', { label: chatWords.openChat, run: open }),
  } : {};
  let chat: ChatPanel | null = $state(null);
  // The chat talks about the open board, or in the folder ('') once boot found no board in it; an
  // archive or restore draws its composer again (N39 ruling 3).
  $effect(() => {
    const [c, id, past] = [chat, shell.boardId || (shell.noBoards ? '' : null), !!shell.past];
    void shell.archived;
    untrack(() => c?.show(id, past));
  });
  // The sidebar opened: replies not seen show (chat-panel.ts `opened`).
  $effect(() => {
    if (shell.chatOpen) untrack(() => chat?.opened());
  });
  // The page's theme, on the page and kept.
  $effect(() => applyTheme(shell.theme));
  // The viewer's alignment (alignSetting flag, field report batch 3 ruling 4) changed in the "⋯" menu: a setting the board hears.
  $effect(() => {
    void shell.align;
    untrack(() => host.settingsChanged());
  });
  function hostChat(panel: HTMLElement) {
    const c = createChatPanel(panel, {
      bridge, confirm: askConfirm, toast,
      boardName: (id) => shell.boards.find((b) => b.board === id)?.title ?? id,
      archived: (id) => shell.archived.some((b) => b.board === id),
      open: async () => { shell.chatOpen = true; await tick(); },
      view: (state) => { shell.chatView = state; },
      ...alongside,
    });
    chat = c;
    return () => { c.destroy(); chat = null; };
  }

  onMount(() => {
    const v = mount(root!, host);
    // What the page shows of the board is its status, mirrored into the page's state.
    const mirror = (patch: Partial<typeof v.status.now>) => { Object.assign(shell, patch); };
    mirror(v.status.now);
    const unmirror = v.status.on(mirror);
    // The chat keeps level with the stage's top, under the header and any strip.
    const stage = root!.querySelector<HTMLElement>('.vb-stage')!;
    skip!.href = `#${stage.id}`;
    const level = new ResizeObserver(() => document.documentElement.style.setProperty('--vb-chat-top', `${stage.getBoundingClientRect().top}px`));
    level.observe(stage);
    // The chat reaches the board through its view; it draws again on every draw.
    const unbridge = bridge.board(v);
    const unrefresh = v.status.on((patch) => { if ('drawn' in patch) bridge.refresh(); });
    // A tab close or reload asks while a note holds unsaved words (leavePrompt flag, M11).
    const unguard = leavePrompt ? guardLeave(v.status) : undefined;
    // A dragged file never replaces the board (chatAttachments flag, point 357).
    const unguardDrops = shell.chatPanel && flagOn('chatAttachments', pageFlags()) ? guardFileDrops(document) : undefined;
    if (new URLSearchParams(location.search).has('vbwork')) exposeWork({ rebuild: () => v.board.rebuild(), idle: () => v.board.idle() });
    view = v;
    return () => { level.disconnect(); unguardDrops?.(); unguard?.(); unrefresh(); unbridge(); unmirror(); v.unmount(); };
  });
</script>

<a class="vb-skip" href="#stage" bind:this={skip}>{chromeBoardWords.skipToTheBoard}</a>
<div bind:this={root}></div>
{#if shell.chatPanel}<ChatSidebar onhost={hostChat} onload={() => chat?.load() ?? Promise.resolve(false)} />{/if}

<Toast />

<ConfirmDialog />
{#if openFolder}<FolderDialog guard={leavePrompt ? view : null} />{/if}
