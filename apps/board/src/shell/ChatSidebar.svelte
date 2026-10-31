<!-- The chat sidebar (chat-panel FE_02 ruling 1, chatPanel flag): the chat beside the board, on the
     right under the toolbar and the strips. The toolbar's Chat button and T open and close it;
     dragging its left edge, or the arrow keys on that edge, sets its width. Both are kept per viewer
     (localStorage, guarded), and the board's stage shrinks beside it (--vb-chat-w, board.css). Its
     contents are the chat package's elements, which the host fills (`onhost`: the board's
     chat-panel.ts, the gallery's recorded turns). On the board they are drawn the first time it
     opens, at start when it was kept open (`onload`): until then it says it is loading, and when they
     did not come, so, with Try again, which reloads the page (a browser keeps a module import that failed
     failed until the page is reloaded; the panel, kept open, then loads at start). The gallery mounts it in
     the page flow. -->
<script lang="ts">
  import * as chatWords from './words/chat.ts';
  import { onMount, untrack } from 'svelte';
  import { shell } from './shell.svelte.ts';
  import { keep, kept } from '../board/kept.ts';

  let { onhost, onload, view, onretry = () => location.reload(), placement = 'board' }: {
    /** Fill the panel; returns what undoes it. */
    onhost: (panel: HTMLElement) => (() => void) | void;
    /** Load the panel's drawing (a no-op once loaded); true once it is drawn. */
    onload?: () => Promise<boolean>;
    /** The drawing's state to show instead of the page's (the gallery's loading and error states). */
    view?: 'idle' | 'loading' | 'ready' | 'error';
    /** Try again, from the error state: by default the page reloads. */
    onretry?: () => void;
    /** `board`: fixed on the right; `gallery`: in the page flow, always open. */
    placement?: 'board' | 'gallery';
  } = $props();

  const WIDTH_KEY = 'vb.chat-width';
  const OPEN_KEY = 'vb.chat-open';
  const [MIN, START, STEP] = [360, 400, 16];
  const onBoard = () => placement === 'board';

  /** The widest it goes: the board keeps at least 480px. */
  const widest = () => Math.max(MIN, Math.min(720, window.innerWidth - 480));
  const clamp = (w: number) => Math.round(Math.min(widest(), Math.max(MIN, w)));

  let width = $state(clamp(Number(kept(WIDTH_KEY)) || START));
  let dragging = $state(false);
  let panel: HTMLElement;
  if (onBoard()) shell.chatOpen = kept(OPEN_KEY) === '1';
  let was = shell.chatOpen;
  let focusNext = false;
  /** Where focus was when the person opened the panel: the composer takes it on load only if it is still there. */
  let openedFrom: Element | null = null;
  const loadState = $derived(view ?? shell.chatView);

  onMount(() => {
    const undo = onhost(panel);
    if (!onBoard()) return undo;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 't' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, dialog, [contenteditable]')) return;
      e.preventDefault();
      shell.chatOpen = !shell.chatOpen;
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); undo?.(); };
  });

  // Open (opened now, or kept open from the last visit): the drawing loads. Opened now, the words go in
  // the composer once it is there. Kept for the next visit either way.
  $effect(() => {
    const open = shell.chatOpen;
    if (!onBoard()) return;
    if (open !== was) {
      was = open;
      keep(OPEN_KEY, open ? '1' : '0');
      focusNext = open;
      openedFrom = open ? document.activeElement : null;
    }
    if (!open) return;
    untrack(() => void load());
  });

  /** Focus has not moved since the panel opened (or only into the panel): a slow load never takes focus the person moved on. */
  function focusStayed(): boolean {
    const at = document.activeElement;
    return at === openedFrom || at === null || at === document.body || !!panel.closest('aside')?.contains(at);
  }

  function load() {
    return (onload?.() ?? Promise.resolve(true)).then((ok) => {
      if (ok && focusNext && shell.chatOpen && focusStayed()) panel.querySelector<HTMLElement>('textarea')?.focus({ preventScroll: true });
      if (ok || !shell.chatOpen) focusNext = false;
    });
  }

  $effect(() => {
    if (!onBoard()) return;
    const root = document.documentElement.style;
    root.setProperty('--vb-chat-w', shell.chatOpen ? `${width}px` : '0px');
    return () => root.removeProperty('--vb-chat-w');
  });

  function grab(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    grip.setPointerCapture(e.pointerId);
    dragging = true;
    const [x0, w0] = [e.clientX, width];
    const move = (m: PointerEvent) => { width = clamp(w0 + x0 - m.clientX); };
    const end = () => {
      dragging = false;
      for (const [type, fn] of [['pointermove', move], ['pointerup', end], ['pointercancel', end]] as const) grip.removeEventListener(type, fn);
      keep(WIDTH_KEY, String(width));
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  /** The edge's keys: Left wider, Right narrower (Shift: four steps), Home narrowest, End widest. */
  function nudge(e: KeyboardEvent) {
    const step = STEP * (e.shiftKey ? 4 : 1);
    const next = { ArrowLeft: width + step, ArrowRight: width - step, Home: MIN, End: widest() }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    width = clamp(next);
    keep(WIDTH_KEY, String(width));
  }
</script>

<aside id={onBoard() ? 'chat' : undefined} class="vb-chat" data-placement={placement} aria-label={chatWords.chatWithTheAgent}
  hidden={onBoard() && !shell.chatOpen}>
  {#if onBoard()}
    <!-- A focusable separator is a widget (WAI-ARIA window splitter): its value is the width. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div class="vb-chat-grip" role="separator" tabindex="0" aria-orientation="vertical" aria-label={chatWords.chatWidth}
      aria-controls="chat" aria-valuenow={width} aria-valuemin={MIN} aria-valuemax={widest()} title={chatWords.dragToResize}
      data-dragging={dragging || undefined} onpointerdown={grab} onkeydown={nudge}></div>
  {/if}
  {#if loadState === 'loading'}
    <p class="vb-chat-state" role="status">{chatWords.loadingTheChat}</p>
  {:else if loadState === 'error'}
    <div class="vb-chat-state" role="alert" data-state="error">
      <p>{chatWords.theChatDidNotLoad}</p>
      <button type="button" class="vb-btn" onclick={() => onretry()}>{chatWords.tryAgain}</button>
    </div>
  {/if}
  <div class="chat-panel" bind:this={panel} hidden={loadState === 'loading' || loadState === 'error'}></div>
</aside>
