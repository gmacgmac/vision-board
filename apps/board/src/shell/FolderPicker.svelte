<!-- The folder picker's contents (openFolder flag, open-folder task, api.md 110, 113): a breadcrumb
     under ~ (each part a button), on the home folder the Cloud storage places (folder-links-cloud
     task: the real folders in ~/Library/CloudStorage, by their real names), the recent folders, then
     the folders in the chosen one, a folder with a Vision Board marked; choosing one lists it.
     Under them, whether the chosen folder has a Vision Board ("Vision Board found (N boards)" with
     Open, or "No Vision Board here" with Create), and Cancel. A view only: FolderDialog.svelte holds
     it in the modal dialog and does the calls; the gallery draws it in each state (home, loading,
     found, not found, problem, opening). `uid` keeps
     its ids apart. With the currentFolder flag (`here` given) the heading reads "Open folder — choose a
     project folder", and under it, apart from the lists, a "Current folder" line: the whole path (`~` for
     home) and a Copy button that copies the absolute path and says "Copied" for a moment (current-folder
     task). Every part is a native button, so Tab reaches each and Enter or Space chooses. -->
<script lang="ts">
  import * as foldersWords from './words/folders.ts';
  import * as shellCommonWords from './words/shell-common.ts';
  import type { FolderEntry, FolderInfo, FolderList } from './page-io.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import { folderPath } from './folder-path.ts';

  let { listing, current, here = null, uid, loading = false, problem = null, busy = false, onchoose, onaccept, oncancel }: {
    /** The chosen folder and what is in it; null until the first listing. */
    listing: FolderList | null;
    /** The folder open now: left out of recent, and not offered again. */
    current: string | null;
    /** The open folder, to show as the Current folder line (currentFolder flag); null, no line. */
    here?: Pick<FolderInfo, 'path' | 'name'> | null;
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
  const boards = (n: number | undefined) => (n === undefined ? '' : foldersWords.board(n));
  // Never a board in home itself (the server refuses it too): it would be every folder's nearest board.
  const isHome = $derived(listing?.name === '~');
  const status = $derived(!listing ? (loading ? foldersWords.readingFolders : '')
    : isHome ? foldersWords.chooseAProjectFolderUnder
    : isOpen ? foldersWords.thisFolderIsOpenNow(boards(listing.boards))
    : listing.found ? foldersWords.visionBoardFound(boards(listing.boards)) : foldersWords.noVisionBoardHere);
  /** Copy the open folder's absolute path: "Copied" for a moment, or why it could not. */
  let copied: 'done' | 'failed' | null = $state(null);
  let copiedTimer = 0;
  async function copyPath() {
    clearTimeout(copiedTimer);
    try {
      await navigator.clipboard.writeText(here!.path);
      copied = 'done';
    } catch { copied = 'failed'; }
    copiedTimer = window.setTimeout(() => { copied = null; }, 2000);
  }
  const action = $derived(listing?.found || isHome ? (busy ? foldersWords.opening : foldersWords.open) : busy ? shellCommonWords.creating : shellCommonWords.create);
</script>

{#snippet row(f: FolderEntry, icon: 'folder' | 'cloud' = 'folder')}
  <li>
    <button type="button" class="vb-folder-row" onclick={() => onchoose(f.path)} disabled={busy}>
      <ButtonIcon name={icon} /><span class="vb-folder-name">{f.name}</span>
      {#if f.hasBoard}<span class="vb-chip vb-folder-mark" data-tone="new" aria-hidden="true">{foldersWords.board2}</span><span class="vb-visually-hidden">{foldersWords.hasAVisionBoard}</span>{/if}
    </button>
  </li>
{/snippet}

<h2 id="{uid}-title">{here ? foldersWords.openFolderChooseAProject : foldersWords.openFolder}</h2>
<p id="{uid}-body" class="vb-dialog-item">{foldersWords.theBoardThenShowsThat(here ? foldersWords.underYourHomeFolder : foldersWords.chooseAProjectFolderUnderYour)}</p>
{#if here}
  <div class="vb-folder-current" role="group" aria-labelledby="{uid}-current">
    <span class="vb-folder-current-label" id="{uid}-current">{foldersWords.currentFolder}</span>
    <code class="vb-folder-current-path">{folderPath(here)}</code>
    <button type="button" class="vb-btn vb-btn-small" id="{uid}-copy" data-done={copied === 'done' || undefined}
      title={foldersWords.copyTheFullPath} onclick={() => void copyPath()}>{copied === 'done' ? foldersWords.copied : shellCommonWords.copy}</button>
    <span class="vb-visually-hidden" role="status">{copied === 'done' ? foldersWords.pathCopied : copied === 'failed' ? foldersWords.couldNotCopySelectThe : ''}</span>
  </div>
{/if}
<nav class="vb-folder-crumbs" aria-label={foldersWords.folderPath}>
  <ol>
    {#each crumbs as c, i (c.path)}
      <li><button type="button" class="vb-folder-crumb" aria-current={i === crumbs.length - 1 ? 'location' : undefined}
        disabled={busy} onclick={() => onchoose(c.path)}>{c.label}</button></li>
    {/each}
  </ol>
</nav>
{#if listing}
<div class="vb-folder-lists" aria-busy={loading}>
  {#if listing.places?.length}
    <h3 class="vb-folder-head" id="{uid}-cloud">{foldersWords.cloudStorage}</h3>
    <ul class="vb-folder-list vb-folder-places" aria-labelledby="{uid}-cloud">{#each listing.places as f (f.path)}{@render row(f, 'cloud')}{/each}</ul>
  {/if}
  {#if recent.length}
    <h3 class="vb-folder-head" id="{uid}-recent">{foldersWords.recent}</h3>
    <ul class="vb-folder-list" aria-labelledby="{uid}-recent">{#each recent as f (f.path)}{@render row(f)}{/each}</ul>
  {/if}
  <h3 class="vb-folder-head" id="{uid}-in">{foldersWords.inText(listing.name)}</h3>
  {#if listing.folders.length}
    <ul class="vb-folder-list vb-folder-in" aria-labelledby="{uid}-in">{#each listing.folders as f (f.path)}{@render row(f)}{/each}</ul>
  {:else}
    <p class="vb-folder-empty">{foldersWords.noFoldersInHere}</p>
  {/if}
  {#if listing.more}<p class="vb-dialog-hint">{foldersWords.onlyTheFirstFoldersAre(listing.folders.length)}</p>{/if}
</div>
{/if}
<p class="vb-folder-status" role="status" data-found={listing?.found || undefined}>{status}</p>
{#if problem}<p class="vb-dialog-problem" role="alert">{problem}</p>{/if}
<div class="vb-dialog-actions">
  <button type="button" class="vb-btn" id="{uid}-cancel" onclick={oncancel}>{shellCommonWords.cancel}</button>
  <button type="button" class="vb-btn vb-btn-primary" id="{uid}-accept" disabled={!listing || isHome || isOpen || loading || busy}
    aria-busy={busy} onclick={onaccept}>{action}</button>
</div>
