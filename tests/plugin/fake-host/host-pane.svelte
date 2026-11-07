<!-- The fake host's own pane and chat, in the host's own Svelte (a second runtime beside the one inside the bundle).
     The board's root is an element this component draws: the host's tree holds the board's. -->
<script>
  let { chat, board, onroot } = $props();
  let root = $state();
  let chips = $state([]);
  let lines = $state([]);
  let clicks = $state(0);
  chat.hear(() => { chips = chat.chips(); lines = chat.lines(); });
  $effect(() => onroot(root));
</script>

<section class="host-pane">
  <header class="host-pane-head">
    <h2>The host's pane</h2>
    <button id="host-count" type="button" onclick={() => { clicks += 1; }}>Host clicks {clicks}</button>
    <button id="host-send" type="button" onclick={() => board().send()}>Host send</button>
  </header>
  <div class="host-root" bind:this={root}></div>
</section>
<aside class="host-chat" aria-label="The host's chat">
  <ul id="host-chips">{#each chips as chip}<li>{chip.label}</li>{/each}</ul>
  <ul id="host-lines">
    {#each lines as line}<li><button type="button" class="host-line" onclick={() => { if (line.reveal) board().reveal(line.reveal); }}>{line.text}</button></li>{/each}
  </ul>
</aside>
