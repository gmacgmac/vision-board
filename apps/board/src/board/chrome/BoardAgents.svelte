<!-- The agents that may draw on the open board (agentAccess flag, D-034): an "Agents" disclosure in
     the toolbar listing the board's holders, its creator first and marked, each other one with
     Remove access, which asks to confirm and then sends `revoke` for the whole board; while the ledger is
     read-only (`readOnly`, else the board's) it is aria-disabled with the reason as its title (FE_01). Shown only
     when the board has holders (a board drawn before agents has none). With `icon` (toolbarMenu
     flag) it carries a bot icon, which a narrow window shows in place of the word, the count
     beside it (board.css). With `row` (adaptiveHeader flag, the narrowest bar) it is a row of the "⋯" menu whose
     list opens in place. The gallery passes `open`. -->
<script lang="ts">
  import * as commonWords from '../words/common.ts';
  import * as chromeBoardsWords from '../words/chrome-boards.ts';
  import type { AccessHolder } from '#actions';
  import ButtonIcon from './ButtonIcon.svelte';
  import { useChrome } from './chrome.svelte.ts';
  import { READ_ONLY_PERSON } from '#actions';

  let { holders, onrevoke, open = false, icon = false, row = false, readOnly }: {
    holders: AccessHolder[];
    /** Asks to confirm, then removes the agent's access to the board. */
    onrevoke: (agent: string) => Promise<void>;
    open?: boolean;
    icon?: boolean;
    row?: boolean;
    /** The ledger is read-only (D-085): Remove access is paused, its title the reason (FE_01). Left out, the board's own state. */
    readOnly?: boolean;
  } = $props();

  const chrome = useChrome();
  const off = $derived(readOnly ?? chrome?.state.readOnly ?? false);
  const paused = $derived(off || undefined);
</script>

{#if holders.length}
  <details class="vb-agents" {open}>
    {#if row}
      <summary class="vb-menu-item" title={chromeBoardsWords.agentsWhoCanDrawOn}><ButtonIcon name="agents" /><span class="vb-menu-label">{chromeBoardsWords.agents}</span><span class="vb-menu-value">{holders.length}</span></summary>
    {:else if icon}
      <summary class="vb-btn" title={chromeBoardsWords.agentsWhoCanDrawOn}><ButtonIcon name="agents" /><span class="vb-btn-text">{chromeBoardsWords.agents}</span> <b>{holders.length}</b></summary>
    {:else}
      <summary class="vb-btn">{chromeBoardsWords.agents} <b>{holders.length}</b></summary>
    {/if}
    <div class="vb-agents-panel vb-surface-panel">
      <h2 class="vb-agents-title">{chromeBoardsWords.canDrawOnThisBoard}</h2>
      <ul class="vb-agents-list">
        {#each holders as h (h.agent)}
          <li class="vb-agents-row">
            <span class="vb-agents-label">{h.label}</span>
            {#if h.creator}
              <span class="vb-agents-note">{chromeBoardsWords.madeThisBoard}</span>
            {:else}
              <button type="button" class="vb-btn vb-btn-small" aria-label={chromeBoardsWords.removeSAccessToThis(h.label)}
                aria-disabled={paused} data-paused={paused} title={off ? READ_ONLY_PERSON : undefined}
                onclick={() => { if (!off) void onrevoke(h.agent); }}>{commonWords.removeAccess}</button>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </details>
{/if}
