<!-- "Locked" beside the board's name (N40 ruling 4, board/lock-flow.ts): the open board is read-only
     for everyone until the person unlocks it from the "⋯" menu. A chip, not a button (unlocking is the
     menu's); a padlock and the word, never shortened on a narrow toolbar; its title gives the reason
     the board's controls are paused. Beside it, out of the toolbar's flow, a polite live region that is
     always there, so a lock from another tab is announced. The toolbar and the gallery both draw this. -->
<script lang="ts">
  import ButtonIcon from './ButtonIcon.svelte';
  import { LOCKED_PERSON } from '#actions';

  let { locked, id }: { locked: boolean; id?: string } = $props();
</script>

{#if locked}
  <span {id} class="vb-chip vb-chip-locked" title="{LOCKED_PERSON} (the &quot;⋯&quot; menu)"><ButtonIcon name="lock" />Locked</span>
{/if}
<span class="vb-visually-hidden" role="status">{locked ? `This board is locked. ${LOCKED_PERSON}.` : ''}</span>
