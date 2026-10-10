<!-- A toolbar button's icon (verification fix): on a narrow window the end group's text buttons
     show this and keep their words for screen readers (board.css, .vb-btn-text). Same drawing
     style as AppIcon: a 24px grid, 1.5 stroke, currentColor. With the toolbarMenu flag: Agents (a
     bot), Send to agent (a bot with a send arrow), Reply (a quote mark) and the "⋯" menu (more); with the openFolder flag,
     Open folder… (a folder). -->
<script lang="ts">
  let { name }: { name: 'hide' | 'theme' | 'reply' | 'chat' | 'agents' | 'send' | 'quote' | 'more' | 'folder' } = $props();
</script>
<svg class="vb-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  {#if name === 'hide'}
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M4 4l16 16" /><circle cx="12" cy="12" r="3" />
  {:else if name === 'theme'}
    <circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
  {:else if name === 'chat'}
    <path d="M3 4h13v9H8l-5 4z" /><path d="M19 8h2v11l-4-3h-7v-1" />
  {:else if name === 'agents'}
    <rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V5 M3 12v3 M21 12v3" /><circle cx="12" cy="4" r="1" />
    <circle cx="9.5" cy="13.5" r="1" fill="currentColor" /><circle cx="14.5" cy="13.5" r="1" fill="currentColor" />
  {:else if name === 'send'}
    <rect x="2" y="9" width="11" height="10" rx="2.5" /><path d="M7.5 9V6.5" /><circle cx="7.5" cy="5.5" r="1" />
    <circle cx="5.5" cy="14" r="0.9" fill="currentColor" /><circle cx="9.5" cy="14" r="0.9" fill="currentColor" />
    <path d="M15 14h7 M19 11l3 3-3 3" />
  {:else if name === 'quote'}
    <path d="M10 12H5V7h5v5c0 3-1.5 5-4.5 6" /><path d="M19 12h-5V7h5v5c0 3-1.5 5-4.5 6" />
  {:else if name === 'more'}
    <circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" />
  {:else if name === 'folder'}
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  {:else}
    <path d="M4 5h16v11H9l-5 4z" />
  {/if}
</svg>
