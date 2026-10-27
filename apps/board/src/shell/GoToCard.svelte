<!-- The Go to card box (goToCard flag; cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md):
     a small box at the board's bottom right, opened by a digit typed on the board (board/go-to-card.ts
     keeps its state). A labelled text field that keeps digits only; Enter goes, Backspace edits, Esc
     closes, and so does focus leaving the box. What a go found when it did not arrive ("No card 99",
     "Card 7 was removed") is announced (role status) and the box stays; a retired card's version is
     offered as a button. Opened, it takes focus; closed without going, focus goes back where it was
     (a go has focused the card already). The gallery mounts it in the page flow, in each state. -->
<script lang="ts">
  import * as commonWords from '../board/words/common.ts';
  import * as shellGoToCardWords from './words/shell-go-to-card.ts';
  import { onMount } from 'svelte';
  import { GO_DIGITS, goDigits, type GoBox } from '../board/go-to-card.ts';

  let { box, placement = 'board', onedit, onenter, onclose, onpast }: {
    box: GoBox;
    placement?: 'board' | 'gallery';
    onedit?(text: string): void;
    onenter?(): void;
    onclose?(): void;
    onpast?(): void;
  } = $props();

  const uid = $props.id();
  let host: HTMLElement;
  let input: HTMLInputElement;

  onMount(() => {
    if (placement === 'gallery') return;
    const back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    return () => {
      const at = document.activeElement;
      if ((!at || at === document.body || host.contains(at)) && back?.isConnected) back.focus({ preventScroll: true });
    };
  });

  function oninput(e: Event & { currentTarget: HTMLInputElement }) {
    // Digits only, shown at once: a letter typed never shows, even when the digits stay the same.
    const field = e.currentTarget;
    const digits = goDigits(field.value);
    if (field.value !== digits) field.value = digits;
    onedit?.(digits);
  }

  /** Enter in the field goes; Esc anywhere in the box closes it (keys.ts leaves both to the box). */
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.target === input) onenter?.();
    else if (e.key === 'Escape') onclose?.();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  /** Focus leaving the box for something else on the page closes it; the window losing focus does not. */
  function onfocusout(e: FocusEvent) {
    if (placement === 'board' && !host.contains(e.relatedTarget as Node | null) && document.hasFocus()) onclose?.();
  }
</script>

<!-- The box listens for the keys and focus of the field and the button inside it. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="vb-go" data-placement={placement} data-state={box.past ? 'retired' : box.said ? 'not-found' : 'typing'}
  bind:this={host} {onkeydown} {onfocusout}>
  <label class="vb-go-label" for="vb-go-field-{uid}">{commonWords.goToCard}</label>
  <input class="vb-go-field" id="vb-go-field-{uid}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength={GO_DIGITS}
    autocomplete="off" spellcheck="false" aria-describedby="vb-go-said-{uid} vb-go-hint-{uid}"
    value={box.text} bind:this={input} {oninput} />
  <p class="vb-go-hint" id="vb-go-hint-{uid}"><kbd>{shellGoToCardWords.enter}</kbd> {shellGoToCardWords.go} <kbd>{commonWords.esc}</kbd> {shellGoToCardWords.close}</p>
  <p class="vb-go-said" id="vb-go-said-{uid}" role="status">{box.said ?? ''}</p>
  {#if box.past}
    <button type="button" class="vb-btn vb-go-past" aria-label={box.past.label} onclick={() => onpast?.()}>{shellGoToCardWords.showV(box.past.version)}</button>
  {/if}
</div>
