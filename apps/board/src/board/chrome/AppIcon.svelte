<!-- The app icon (navigation FE_05): one source box fanning out to three outputs, on a 24px grid.
     Drawn in currentColor, which board.css sets to --vb-brand-mark. Still, no animation.
     public/favicon.svg is the same drawing with the token's two values (app-icon.test.ts). -->
<script lang="ts"></script>
<svg class="vb-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path d="M7 12C12 12 12 4 17 4M7 12h10M7 12C12 12 12 20 17 20" />
  <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" stroke="none" />
  <g class="vb-brand-out" fill="currentColor" stroke="none">
    <rect x="17" y="2" width="6" height="4" rx="1" />
    <rect x="17" y="10" width="6" height="4" rx="1" />
    <rect x="17" y="18" width="6" height="4" rx="1" />
  </g>
</svg>
