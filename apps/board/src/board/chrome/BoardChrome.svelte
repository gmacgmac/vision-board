<!-- The board's controls, all of them, inside `mount`'s root (mount.ts; PLAN Decisions: Svelte, compiled
     inside): the header, the requests strip (agentAccess flag) and the proposals notice (proposals flag) or,
     while a past version shows, its banner (versionView flag), the stage, the reply panel, the key commands
     bubble (keyBubble flag), the Go to card box while a digit typed on the board has it open (goToCard flag),
     or `/`, for words (cardSearch flag), the New board / Rename board dialog (boardEdit flag) and the Archived
     list (archiveBoard flag). Notes open in a bubble beside their card (board/notes/notes.ts). Notices and
     confirmations are the host's (`notify`, `confirm`). The stage is the board's own element, which the
     framework-free board draws in; `stage` is the flag-off page's, which draws its own (boardChromeInMount). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as commonWords from '../words/common.ts';
  import * as chromeBoardWords from '../words/chrome-board.ts';
  import { provideChrome, type Chrome } from './chrome.svelte.ts';
  import type { BoardControls } from '../mount.ts';
  import Toolbar from './Toolbar.svelte';
  import ReplyPanel from './ReplyPanel.svelte';
  import BoardDialog from './BoardDialog.svelte';
  import AccessRequests from './AccessRequests.svelte';
  import ProposalsBar from './ProposalsBar.svelte';
  import VersionBanner from './VersionBanner.svelte';
  import KeyHelp from './KeyHelp.svelte';
  import GoToCard from './GoToCard.svelte';
  import ArchivedDialog from './ArchivedDialog.svelte';

  let { chrome, board, send, stage }: {
    chrome: Chrome;
    /** The board's controls, once it is mounted. */
    board: () => BoardControls | null;
    send: () => Promise<string | null>;
    stage?: Snippet;
  } = $props();

  // svelte-ignore state_referenced_locally
  provideChrome(chrome);
  // svelte-ignore state_referenced_locally
  const { state: shown, flag, id, root, ids, pageWide } = chrome;
  const notReady = () => Promise.resolve(chromeBoardWords.theBoardIsNotReady);
</script>

<Toolbar
  onboard={(b) => board()?.switchTo(b)}
  onversion={(seq) => board()?.showVersion(seq) ?? Promise.resolve()}
  ongo={(c) => board()?.goToContainer(c)}
  onopen={(n) => board()?.go.to(n)}
  oncommand={(c) => board()?.command(c)}
  onhide={() => board()?.toggleHide()}
  onsend={send}
  onrevoke={(agent) => board()?.access.revoke(undefined, agent) ?? Promise.resolve()}
  onflagged={() => board()?.nextFlagged()}
  onarchive={() => void board()?.boardEdit.archive()}
  onlock={() => void board()?.boardEdit.lock()}
/>
{#if shown.past}
  <VersionBanner run={shown.past} {root} onback={() => void board()?.showVersion(null)} />
{:else}
  {#if shown.agentAccess}
    <AccessRequests requests={shown.requests} news={shown.requestNews} byBot={flag('accessByBot')} {root} {ids}
      onanswer={(seq, a, text) => board()?.access.answer(seq, a, text) ?? Promise.resolve(false)}
      onallowall={(seqs) => board()?.access.answerAll(seqs) ?? Promise.resolve(false)} />
  {/if}
  <ProposalsBar rows={shown.proposals} news={shown.proposalNews} {ids}
    onreview={(n) => board()?.proposals.review(n)} onacceptall={() => void board()?.proposals.acceptAll()} />
{/if}

{#if stage}{@render stage()}{:else}
  <svelte:element this={pageWide ? 'main' : 'div'} id={id('stage')} class="vb-stage vb-ground" role={pageWide ? undefined : 'group'} tabindex="-1" aria-label={commonWords.board}></svelte:element>
{/if}
<!-- The selection, perceivable without colour (3_FE_01 ruling 9): a polite live region. -->
<p id={id('selection-status')} class="vb-visually-hidden" role="status">{shown.selection}</p>

<ReplyPanel />

{#if flag('keyBubble')}<KeyHelp />{/if}
{#if shown.go}
  <GoToCard box={shown.go} {ids} search={board()?.go.words ?? false} onedit={(text) => board()?.go.edit(text)} onenter={() => board()?.go.enter()}
    onclose={() => board()?.go.close()} onpast={() => void board()?.go.openPast()} onstep={(dir) => board()?.go.step(dir)} />
{/if}

<BoardDialog onsave={(action, fields) => board()?.boardEdit.save(action, fields) ?? notReady()} />
{#if flag('archiveBoard')}<ArchivedDialog onrestore={(b) => board()?.boardEdit.restore(b) ?? notReady()} />{/if}
