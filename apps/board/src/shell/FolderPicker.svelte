<!-- The folder picker's contents (openFolder flag, open-folder task, api.md 110, 113): a breadcrumb
     under ~ (each part a button), the recent folders, then the folders in the chosen one, a folder
     with a Vision Board marked; choosing one lists it. Under them, whether the chosen folder has a
     Vision Board ("Vision Board found (N boards)" with Open, or "No Vision Board here" with Create),
     and Cancel. A view only: FolderDialog.svelte holds it in the modal dialog and does the calls;
     the gallery draws it in each state (loading, found, not found, problem, opening). `uid` keeps
     its ids apart. Every part is a native button, so Tab reaches each and Enter or Space chooses. -->
<script lang="ts">
  import type { FolderEntry, FolderList } from '../board/io.ts';
  import ButtonIcon from './ButtonIcon.svelte';

  let { listing, current, uid, loading = false, problem = null, busy = false, onchoose, onaccept, oncancel }: {
    /** The chosen folder and what is in it; null until the first listing. */
    listing: FolderList | null;
    /** The folder open now: left out of recent, and not offered again. */
    current: string | null;
    uid: string;
    loading?: boolean;
    problem?: string | null;
    /** Open or Create is on its way. */
    busy?: boolean;
    onchoose: (path: string) => void;
    onaccept: () => void;
    oncancel: () => void;
  } = $props();

  /** The chosen folder's path as buttons: `~`, then each folder under it (or the whole path, outside home). */
  const crumbs = $derived.by(() => {
    if (!listing) return [];
    const parts = listing.name.split('/');
    if (parts[0] !== '~') return [{ label: listing.name, path: listing.path }];
    const segs = listing.path.split('/');
    return parts.map((label, i) => ({ label, path: segs.slice(0, segs.length - (parts.length - 1 - i)).join('/') || '/' }));
  });
  const recent = $derived(listing?.recent.filter((f) => f.path !== current) ?? []);
  const isOpen = $derived(listing !== null && listing.path === current);
  const boards = (n: number | undefined) => (n === undefined ? '' : ` (${n} board${n === 1 ? '' : 's'})`);
  // Never a board in home itself (the server refuses it too): it would be every folder's nearest board.
  const isHome = $derived(listing?.name === '~');
  const status = $derived(!listing ? (loading ? 'Reading folders…' : '')
    : isHome ? 'Choose a project folder under ~'
    : isOpen ? `This folder is open now${boards(listing.boards)}.`
    : listing.found ? `Vision Board found${boards(listing.boards)}` : 'No Vision Board here');
  const action = $derived(listing?.found || isHome ? (busy ? 'Opening…' : 'Open') : busy ? 'Creating…' : 'Create');
</script>

{#snippet row(f: FolderEntry)}
  <li>
    <button type="button" class="vb-folder-row" onclick={() => onchoose(f.path)} disabled={busy}>
      <ButtonIcon name="folder" /><span class="vb-folder-name">{f.name}</span>
      {#if f.hasBoard}<span class="vb-chip vb-folder-mark" data-tone="new" aria-hidden="true">board</span><span class="vb-visually-hidden">, has a Vision Board</span>{/if}
    </button>
  </li>
{/snippet}

<h2 id="{uid}-title">Open folder</h2>
<p id="{uid}-body" class="vb-dialog-item">Choose a project folder under your home folder. The board then shows that folder's boards, and the chat works there.</p>
<nav class="vb-folder-crumbs" aria-label="Folder path">
  <ol>
    {#each crumbs as c, i (c.path)}
      <li><button type="button" class="vb-folder-crumb" aria-current={i === crumbs.length - 1 ? 'location' : undefined}
        disabled={busy} onclick={() => onchoose(c.path)}>{c.label}</button></li>
    {/each}
  </ol>
</nav>
{#if listing}
<div class="vb-folder-lists" aria-busy={loading}>
  {#if recent.length}
    <h3 class="vb-folder-head" id="{uid}-recent">Recent</h3>
    <ul class="vb-folder-list" aria-labelledby="{uid}-recent">{#each recent as f (f.path)}{@render row(f)}{/each}</ul>
  {/if}
  <h3 class="vb-folder-head" id="{uid}-in">In {listing.name}</h3>
  {#if listing.folders.length}
    <ul class="vb-folder-list vb-folder-in" aria-labelledby="{uid}-in">{#each listing.folders as f (f.path)}{@render row(f)}{/each}</ul>
  {:else}
    <p class="vb-folder-empty">No folders in here.</p>
  {/if}
  {#if listing.more}<p class="vb-dialog-hint">Only the first {listing.folders.length} folders are listed.</p>{/if}
</div>
{/if}
<p class="vb-folder-status" role="status" data-found={listing?.found || undefined}>{status}</p>
{#if problem}<p class="vb-dialog-problem" role="alert">{problem}</p>{/if}
<div class="vb-dialog-actions">
  <button type="button" class="vb-btn" id="{uid}-cancel" onclick={oncancel}>Cancel</button>
  <button type="button" class="vb-btn vb-btn-primary" id="{uid}-accept" disabled={!listing || isHome || isOpen || loading || busy}
    aria-busy={busy} onclick={onaccept}>{action}</button>
</div>
