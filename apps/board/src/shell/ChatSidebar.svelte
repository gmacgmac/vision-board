<!-- The chat sidebar (chat-panel FE_02 ruling 1, chatPanel flag): the chat beside the board, on the
     right under the toolbar and the strips. The toolbar's Chat button and T open and close it;
     dragging its left edge, or the arrow keys on that edge, sets its width. Both are kept per viewer
     (localStorage, guarded), and the board's stage shrinks beside it (--vb-chat-w, board.css). Its
     contents are the chat package's elements, which the host fills (`onhost`: the board's
     board/chat-panel.ts, the gallery's recorded turns). The gallery mounts it in the page flow. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { shell } from './shell.svelte.ts';
  import { keep, kept } from './kept.ts';

  let { onhost, placement = 'board' }: {
    /** Fill the panel; returns what undoes it. */
    onhost: (panel: HTMLElement) => (() => void) | void;
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

  // Opened: the words go in the composer. Kept for the next visit either way.
  $effect(() => {
    const open = shell.chatOpen;
    if (!onBoard() || open === was) return;
    was = open;
    keep(OPEN_KEY, open ? '1' : '0');
    if (open) queueMicrotask(() => panel.querySelector<HTMLElement>('textarea')?.focus({ preventScroll: true }));
  });

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

<aside id={onBoard() ? 'chat' : undefined} class="vb-chat" data-placement={placement} aria-label="Chat with the agent"
  hidden={onBoard() && !shell.chatOpen}>
  {#if onBoard()}
    <!-- A focusable separator is a widget (WAI-ARIA window splitter): its value is the width. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div class="vb-chat-grip" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Chat width"
      aria-controls="chat" aria-valuenow={width} aria-valuemin={MIN} aria-valuemax={widest()} title="Drag to resize · ← →"
      data-dragging={dragging || undefined} onpointerdown={grab} onkeydown={nudge}></div>
  {/if}
  <div class="chat-panel" bind:this={panel}></div>
</aside>
