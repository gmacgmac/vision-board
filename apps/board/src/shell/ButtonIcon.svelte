<!-- A toolbar button's icon (verification fix): on a narrow window the end group's text buttons
     show this and keep their words for screen readers (board.css, .vb-btn-text). Same drawing
     style as AppIcon: a 24px grid, 1.5 stroke, currentColor. -->
<script lang="ts">
  let { name }: { name: 'hide' | 'theme' | 'reply' } = $props();
</script>
<svg class="vb-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  {#if name === 'hide'}
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M4 4l16 16" /><circle cx="12" cy="12" r="3" />
  {:else if name === 'theme'}
    <circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
  {:else}
    <path d="M4 5h16v11H9l-5 4z" />
  {/if}
</svg>
