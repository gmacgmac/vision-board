<!-- The Go to card box (goToCard flag; cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md):
     a small box at the board's bottom right, opened by a digit typed on the board (board/find/go-to-card.ts
     keeps its state). A labelled text field that keeps digits only; Enter goes, Backspace edits, Esc
     closes, and so does focus leaving the box. What a go found when it did not arrive ("No card 99",
     "Card 7 was removed") is announced (role status) and the box stays; a retired card's version is
     offered as a button. Opened, it takes focus; closed without going, focus goes back where it was
     (a go has focused the card already). The gallery mounts it in the page flow, in each state.
     With `search` (cardSearch flag, SEARCH_02) the box is "Find a card" and takes words too ("Card number
     or words"): the status says "1 of 3 · card 12, in the title", or "No matches"; ↓ and ↑
     step through the matches (go-to-card.ts keeps them and marks the board). -->
<script lang="ts">
  import * as commonWords from '../words/common.ts';
  import * as chromeGoToCardWords from '../words/chrome-go-to-card.ts';
  import { onMount } from 'svelte';
  import { GO_DIGITS, goDigits, type GoBox } from '../find/index.ts';

  let { box, placement = 'board', search = false, ids = '', onedit, onenter, onclose, onpast, onstep }: {
    /** The mount's prefix for the box's ids (mount-ids.ts). */
    ids?: string;
    box: GoBox;
    placement?: 'board' | 'gallery';
    /** The cardSearch flag: the field takes words, and ↓/↑ step through the matches. */
    search?: boolean;
    onedit?(text: string): void;
    onenter?(): void;
    onclose?(): void;
    onpast?(): void;
    onstep?(dir: 1 | -1): void;
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
    const field = e.currentTarget;
    if (search) return onedit?.(field.value);
    // Digits only, shown at once: a letter typed never shows, even when the digits stay the same.
    const digits = goDigits(field.value);
    if (field.value !== digits) field.value = digits;
    onedit?.(digits);
  }

  /** Enter in the field goes; ↓/↑ in it step (search); Esc anywhere in the box closes it (keys.ts leaves them to the box). */
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.target === input) onenter?.();
    else if (search && e.target === input && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) onstep?.(e.key === 'ArrowDown' ? 1 : -1);
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
<div class="vb-go vb-surface-pop" data-placement={placement} data-state={box.past ? 'retired' : box.said ? 'not-found' : box.found ? 'found' : 'typing'}
  data-search={search ? '' : undefined} bind:this={host} {onkeydown} {onfocusout}>
  <label class="vb-go-label" for="{ids}vb-go-field-{uid}">{search ? chromeGoToCardWords.findACard : commonWords.goToCard}</label>
  <!-- Digits only, or with search any text: no numeric keypad, pattern or length then, and a placeholder. -->
  <input class="vb-go-field" id="{ids}vb-go-field-{uid}" type="text" inputmode={search ? undefined : 'numeric'} pattern={search ? undefined : '[0-9]*'}
    maxlength={search ? undefined : GO_DIGITS} placeholder={search ? chromeGoToCardWords.cardNumberOrWords : undefined}
    autocomplete="off" spellcheck="false" aria-describedby="{ids}vb-go-said-{uid} {ids}vb-go-hint-{uid}"
    value={box.text} bind:this={input} {oninput} />
  <p class="vb-go-hint" id="{ids}vb-go-hint-{uid}">{#if search}<kbd>{chromeGoToCardWords.steps}</kbd> {chromeGoToCardWords.step}{' '}{/if}<kbd>{chromeGoToCardWords.enter}</kbd> {chromeGoToCardWords.go} <kbd>{commonWords.esc}</kbd> {chromeGoToCardWords.close}</p>
  <!-- One polite status: what a go found, or the matches' one sentence ("1 of 3 · card 12, in a note"), its count bold. -->
  <p class="vb-go-said" id="{ids}vb-go-said-{uid}" role="status" data-tone={box.found ? 'found' : undefined}>{#if box.found}<span class="vb-go-count">{box.found.count}</span>{box.found.text.slice(box.found.count.length)}{:else}{box.said ?? ''}{/if}</p>
  {#if box.past}
    <button type="button" class="vb-btn vb-go-past" aria-label={box.past.label} onclick={() => onpast?.()}>{chromeGoToCardWords.showV(box.past.version)}</button>
  {/if}
</div>
