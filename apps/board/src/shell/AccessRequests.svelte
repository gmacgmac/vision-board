<!-- The requests strip (agentAccess flag, D-027): under the header while any grant request is
     open, one row per request, "<agent> asks to write in <container>" and its reason, with Allow
     and Refuse. Refuse opens a one-line optional note, then sends `deny`; Allow sends `grant`.
     Both are the person's decision (rule 8), sent through the board's act path. A region
     landmark with a heading; a polite live region, always present so it is heard, announces a
     request that arrives while the page is open. The strip itself shows only while a request
     is open. The gallery passes `refusing` to draw a row with its note open. -->
<script lang="ts">
  import { tick } from 'svelte';
  import type { AccessRequestRow } from './shell.svelte.ts';

  let { requests, onanswer, refusing = null, placement = 'board', ready = true }: {
    requests: AccessRequestRow[];
    /** Sends `grant` or `deny`; resolves true when it was recorded. */
    onanswer: (seq: number, answer: 'grant' | 'deny', text?: string) => Promise<boolean>;
    /** The request whose note is open (the gallery); the board opens it with Refuse. */
    refusing?: number | null;
    /** `board`: fixed under the header; `gallery`: in the page flow. */
    placement?: 'board' | 'gallery';
    /** False until the board has loaded, so the requests already open then are not announced. */
    ready?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let open: number | null = $state(refusing);
  let note = $state('');
  let busy: number | null = $state(null);
  let announce = $state('');
  /** Requests already shown, so only one that arrives later is announced. */
  const known = new Set<number>();
  let primed = false;

  $effect(() => {
    if (!ready) return;
    const fresh = requests.filter((r) => !known.has(r.seq));
    for (const r of requests) known.add(r.seq);
    if (primed && fresh.length) announce = fresh.map((r) => `${r.label} asks to write in ${r.container}`).join('. ');
    primed = true;
  });

  /** On the board the strip pushes the stage down by its height (board.css, --vb-strip-h), so
   * it never covers the top of the board; the property goes when the strip does. */
  let height = $state(0);
  $effect(() => {
    if (placement !== 'board') return;
    const root = document.documentElement.style;
    root.setProperty('--vb-strip-h', `${requests.length ? height : 0}px`);
    return () => root.removeProperty('--vb-strip-h');
  });

  const heading = $derived(requests.length === 1 ? 'An agent asks for access' : `${requests.length} agents ask for access`);
  const idOf = (seq: number, part: string) => `${placement}-request-${seq}-${part}`;

  /** After an answer the row is gone: focus the next row's Allow, else the board. */
  async function refocus() {
    await tick();
    const next = document.querySelector<HTMLElement>(`[data-placement="${placement}"] .vb-access-allow`);
    (next ?? document.getElementById('stage'))?.focus();
  }

  async function answer(r: AccessRequestRow, a: 'grant' | 'deny', text?: string) {
    if (busy !== null) return;
    busy = r.seq;
    const ok = await onanswer(r.seq, a, text);
    busy = null;
    if (!ok) return;
    open = null;
    note = '';
    await refocus();
  }

  async function startRefuse(r: AccessRequestRow) {
    open = r.seq;
    note = '';
    await tick();
    document.getElementById(idOf(r.seq, 'note'))?.focus();
  }

  async function cancelRefuse(r: AccessRequestRow) {
    open = null;
    await tick();
    document.getElementById(idOf(r.seq, 'refuse'))?.focus();
  }

  function noteKey(e: KeyboardEvent, r: AccessRequestRow) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    void cancelRefuse(r);
  }
</script>

{#if requests.length}
<section class="vb-access" data-placement={placement} aria-labelledby={idOf(0, 'title')} bind:offsetHeight={height}>
  <h2 class="vb-access-title" id={idOf(0, 'title')}>{heading}</h2>
  <ul class="vb-access-list">
    {#each requests as r (r.seq)}
      <li class="vb-access-row" data-request={r.seq} aria-busy={busy === r.seq ? 'true' : undefined}>
        <p class="vb-access-text">
          <span class="vb-access-ask"><b>{r.label}</b> asks to write in <b>{r.container}</b></span>
          <span class="vb-access-reason">{r.reason}</span>
        </p>
        {#if open === r.seq}
          <form class="vb-access-actions" onsubmit={(e) => { e.preventDefault(); void answer(r, 'deny', note.trim() || undefined); }}>
            <label class="vb-visually-hidden" for={idOf(r.seq, 'note')}>Note for {r.label} (optional)</label>
            <input class="vb-access-note" id={idOf(r.seq, 'note')} type="text" maxlength="4000" autocomplete="off"
              placeholder="Optional: why not?" bind:value={note} onkeydown={(e) => noteKey(e, r)} />
            <button type="submit" class="vb-btn vb-btn-small" aria-label="Refuse {r.label}">Refuse</button>
            <button type="button" class="vb-btn vb-btn-small" onclick={() => cancelRefuse(r)}>Cancel</button>
          </form>
        {:else}
          <div class="vb-access-actions">
            <button type="button" class="vb-btn vb-btn-small vb-btn-primary vb-access-allow"
              aria-label="Allow {r.label} to write in {r.container}" onclick={() => answer(r, 'grant')}>Allow</button>
            <button type="button" class="vb-btn vb-btn-small" id={idOf(r.seq, 'refuse')}
              aria-label="Refuse {r.label}" onclick={() => startRefuse(r)}>Refuse</button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>
{/if}
<span class="vb-visually-hidden" id={idOf(0, 'announce')} aria-live="polite">{announce}</span>
