<!-- The agents that may draw on the open board (agentAccess flag, D-034): an "Agents" disclosure in
     the toolbar listing the board's holders, its creator first and marked, each other one with
     Remove access, which asks to confirm and then sends `revoke` for the whole board. Shown only
     when the board has holders (a board drawn before agents has none). With `icon` (toolbarMenu
     flag) it carries a bot icon, which a narrow window shows in place of the word, the count
     beside it (board.css). The gallery passes `open`. -->
<script lang="ts">
  import type { AccessHolder } from '../../../../packages/actions/src/index.ts';
  import ButtonIcon from './ButtonIcon.svelte';

  let { holders, onrevoke, open = false, icon = false }: {
    holders: AccessHolder[];
    /** Asks to confirm, then removes the agent's access to the board. */
    onrevoke: (agent: string) => Promise<void>;
    open?: boolean;
    icon?: boolean;
  } = $props();
</script>

{#if holders.length}
  <details class="vb-agents" {open}>
    {#if icon}
      <summary class="vb-btn" title="Agents who can draw on this board"><ButtonIcon name="agents" /><span class="vb-btn-text">Agents</span> <b>{holders.length}</b></summary>
    {:else}
      <summary class="vb-btn">Agents <b>{holders.length}</b></summary>
    {/if}
    <div class="vb-agents-panel">
      <h2 class="vb-agents-title">Can draw on this board</h2>
      <ul class="vb-agents-list">
        {#each holders as h (h.agent)}
          <li class="vb-agents-row">
            <span class="vb-agents-label">{h.label}</span>
            {#if h.creator}
              <span class="vb-agents-note">made this board</span>
            {:else}
              <button type="button" class="vb-btn vb-btn-small" aria-label="Remove {h.label}'s access to this board"
                onclick={() => onrevoke(h.agent)}>Remove access</button>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </details>
{/if}
