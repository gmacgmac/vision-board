<!-- The toolbar: board picker, board title and version, counts, and the board-wide buttons.
     Send to agent shows with the agentAccess flag. -->
<script lang="ts">
  import { shell } from './shell.svelte.ts';
  import SendButton from './SendButton.svelte';

  let { onboard, onfit, onhide, onsend }: {
    onboard: (id: string) => void;
    onfit: () => void;
    onhide: () => void;
    onsend: () => Promise<string | null>;
  } = $props();

  const THEMES = ['system', 'light', 'dark'] as const;
  type Theme = (typeof THEMES)[number];
  const stored = localStorage.getItem('vb-theme');
  let theme: Theme = $state(THEMES.includes(stored as Theme) ? (stored as Theme) : 'system');

  $effect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    localStorage.setItem('vb-theme', theme);
  });

  const nextTheme = () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!; };
  const label = (title: string) => title.replace(/[&<>"]/g, '');
</script>

<header class="vb-toolbar">
  <div class="vb-brand" aria-hidden="true"><span></span></div>
  <label class="vb-visually-hidden" for="board">Board</label>
  <select id="board" class="vb-select" value={shell.boardId}
    onchange={(e) => onboard(e.currentTarget.value)}>
    {#each shell.boards as b (b.id)}
      <option value={b.id}>{label(b.title)} · v{b.seq}</option>
    {/each}
  </select>
  <h1 id="title" class="vb-title">{shell.title}</h1>
  <span id="version" class="vb-chip" hidden={shell.version === null} title={shell.summary}>v{shell.version}</span>
  <div id="counts" class="vb-counts" aria-live="polite">
    {#if shell.version !== null}
      <span class="vb-chip" data-tone="open"><b>{shell.counts.open}</b> open</span>
      <span class="vb-chip" data-tone="decided"><b>{shell.counts.decided}</b> decided</span>
      <span class="vb-chip" data-tone="later"><b>{shell.counts.later}</b> later</span>
    {/if}
  </div>
  <div class="vb-toolbar-end">
    <button type="button" class="vb-btn" id="hide" aria-pressed={shell.hide} title="Hide decided items · H"
      onclick={onhide}>Hide decided</button>
    <button type="button" class="vb-btn" id="fit" title="Fit the board · F" onclick={onfit}>Fit</button>
    <button type="button" class="vb-btn" id="theme" title="Theme" onclick={nextTheme}>Theme: {theme}</button>
    <button type="button" class="vb-btn vb-btn-primary" id="reply-toggle" aria-expanded={shell.replyOpen}
      aria-controls="reply" onclick={() => { shell.replyOpen = !shell.replyOpen; }}>
      Reply{shell.answered ? ` (${shell.answered})` : ''}
    </button>
    {#if shell.agentAccess && shell.version !== null}<SendButton {onsend} />{/if}
  </div>
</header>
