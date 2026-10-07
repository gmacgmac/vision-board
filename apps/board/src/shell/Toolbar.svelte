<!-- The toolbar: board picker, board title and version, counts, the zoom group and the board-wide
     buttons. The picker marks a board the person has not opened " · new" and one an agent wrote on
     since they last looked " · changed", never the open one, and a chip counts both (the conditions
     table, board/attention.ts; FE_01 ruling 1); the chip sits in the counts' live region.
     Send to agent and the board's Agents list show with the agentAccess flag. Zoom out/Fit/Zoom in are one command table
     (board/commands.ts) shared with the selection bar and the keys (3_FE_02 ruling 5). -->
<script lang="ts">
  import { shell } from './shell.svelte.ts';
  import SendButton from './SendButton.svelte';
  import BoardAgents from './BoardAgents.svelte';
  import { commandTitle, HEADER_COMMANDS } from '../board/commands.ts';
  import type { CommandId } from '../board/commands.ts';

  let { onboard, oncommand, onhide, onsend, onrevoke }: {
    onboard: (id: string) => void;
    oncommand: (id: CommandId) => void;
    onhide: () => void;
    onsend: () => Promise<string | null>;
    /** Remove an agent's access to the open board (BoardAgents). */
    onrevoke: (agent: string) => Promise<void>;
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
  const updated = $derived(Object.keys(shell.boardMarks).length);
</script>

<header class="vb-toolbar">
  <div class="vb-brand" aria-hidden="true"><span></span></div>
  <label class="vb-visually-hidden" for="board">Board</label>
  <select id="board" class="vb-select" value={shell.boardId}
    onchange={(e) => onboard(e.currentTarget.value)}>
    {#each shell.boards as b (b.board)}
      <option value={b.board}>{label(b.title)} · v{b.seq}{shell.boardMarks[b.board] ? ` · ${shell.boardMarks[b.board]}` : ''}</option>
    {/each}
  </select>
  <h1 id="title" class="vb-title">{shell.title}</h1>
  <span id="version" class="vb-chip" hidden={shell.version === null} title={shell.summary}>v{shell.version}</span>
  <div id="counts" class="vb-counts" aria-live="polite">
    {#if updated}<span id="boards-updated" class="vb-chip" data-tone="new">{updated} board{updated === 1 ? '' : 's'} updated</span>{/if}
    {#if shell.version !== null}
      <span class="vb-chip" data-tone="open"><b>{shell.counts.open}</b> open</span>
      <span class="vb-chip" data-tone="decided"><b>{shell.counts.decided}</b> decided</span>
      <span class="vb-chip" data-tone="later"><b>{shell.counts.later}</b> later</span>
    {/if}
  </div>
  <div class="vb-toolbar-end">
    <div class="vb-zoom" role="group" aria-label="Zoom">
      {#each HEADER_COMMANDS as id (id)}
        <button type="button" class="vb-btn" title={commandTitle(id)} aria-label={commandTitle(id).split(' · ')[0]}
          onclick={() => oncommand(id)}>{id === 'fit' ? 'Fit' : id === 'zoom-out' ? '−' : '+'}</button>
      {/each}
    </div>
    <button type="button" class="vb-btn" id="hide" aria-pressed={shell.hide} title="Hide decided items · H"
      onclick={onhide}>Hide decided</button>
    <button type="button" class="vb-btn" id="theme" title="Theme" onclick={nextTheme}>Theme: {theme}</button>
    <button type="button" class="vb-btn vb-btn-primary" id="reply-toggle" aria-expanded={shell.replyOpen}
      aria-controls="reply" onclick={() => { shell.replyOpen = !shell.replyOpen; }}>
      Reply{shell.answered ? ` (${shell.answered})` : ''}
    </button>
    {#if shell.agentAccess && shell.version !== null}
      <BoardAgents holders={shell.boardHolders} {onrevoke} />
      <SendButton {onsend} />
    {/if}
  </div>
</header>
