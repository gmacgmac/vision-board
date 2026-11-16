<!-- A part of the page loaded the first time it is wanted (board/lazy.ts): nothing is drawn until `when` first holds
     and the part's chunk is there, then the part with the rest of the props, kept from then on, so a dialog keeps its
     own open and close. The state that wants it is set before it loads, so the click or key that opened it is not
     lost: the part opens on that state when it arrives. A load that fails calls `onfail` (put the state back and say
     so), so the next try loads again. -->
<script lang="ts" generics="P extends Record<string, unknown>">
  import type { Component } from 'svelte';
  import type { LazyPart } from '../lazy.ts';

  let { part, when = true, onfail, ...props }: { part: LazyPart<Component<P>>; when?: boolean; onfail: () => void } & P = $props();
  // svelte-ignore state_referenced_locally
  let Part = $state(part.ready);

  $effect(() => {
    if (when && !Part) part.load().then((p) => { Part = p; }, onfail);
  });
</script>

{#if Part}<Part {...props as unknown as P} />{/if}
