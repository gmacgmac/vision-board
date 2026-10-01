<!-- The toolbar: session picker, board title and version, counts, and the board-wide buttons. -->
<script lang="ts">
  import { shell } from './shell.svelte.ts';

  let { onsession, onfit, onhide }: {
    onsession: (id: string) => void;
    onfit: () => void;
    onhide: () => void;
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
  <label class="vb-visually-hidden" for="session">Session</label>
  <select id="session" class="vb-select" value={shell.sessionId}
    onchange={(e) => onsession(e.currentTarget.value)}>
    {#each shell.sessions as s (s.id)}
      <option value={s.id}>{label(s.title)} · v{s.versions.at(-1)}</option>
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
  </div>
</header>
