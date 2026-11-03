<!-- The page's open ledger in the board's header (ledgerFolders flag, D-084 7; LEDGER_UI_01), once the server names one:
     in the path after the folder (full: its icon, its name and a chevron; half: the same, the name cut with "…" first,
     styles/ledgers.css), or with `row` (a third of the width) a row of "⋯", which closes the menu first (`choose`).
     The board picker's pattern (board/chrome/BoardPicker.svelte): a native select lies unseen over the face
     (`.vb-menu-face`), so its list, keys and reading are the browser's. It lists the folder's ledgers by name with
     their board counts, the open one selected, then New ledger…, which opens the New ledger dialog. Choosing a ledger
     opens it and the page reloads onto it (ledgers.ts `openLedger`); while it is on its way the face says so and the
     list is shut; a refusal is a toast, and the open ledger stays. With one ledger the list still opens, with
     New ledger…. The gallery passes `folder` (a sample's ledgers), `opening` and `look`. -->
<script lang="ts">
  import { ButtonIcon } from '../board/chrome/index.ts';
  import { mayLeave, openLedger, problemWords } from './ledgers.ts';
  import type { FolderInfo } from './page-io.ts';
  import { shell, toast } from './shell.svelte.ts';
  import * as chromeCommonWords from '../board/words/chrome-common.ts';
  import * as ledgerWords from './words/ledgers.ts';

  let { id, look, choose, row, folder = undefined, opening = undefined }: {
    id?: string | undefined;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
    choose?: ((run: () => void) => void) | undefined;
    /** The row's word, in the "⋯" menu. */
    row?: string | undefined;
    /** The open folder's ledger and ledgers (the gallery's); left out, the page's own. */
    folder?: Pick<FolderInfo, 'ledger' | 'ledgers' | 'boards'> | null | undefined;
    /** The ledger on its way (the gallery's); left out, the page's own. */
    opening?: string | null | undefined;
  } = $props();

  /** The list's last entry, never a ledger's name (a name holds no ":"). */
  const NEW = ':new';
  const here = $derived(folder === undefined ? shell.folder : folder);
  const name = $derived(here?.ledger ?? '');
  const ledgers = $derived(here?.ledgers ?? (name ? [{ name, boards: here?.boards ?? 0, keptOutOfGit: false }] : []));
  const going = $derived(opening === undefined ? shell.ledgerOpening : opening);
  const act = (run: () => void) => (choose ? choose(run) : run());

  async function go(to: string) {
    if (!(await mayLeave())) return;
    try { await openLedger(to); } catch (err) { toast(problemWords(err), 'error'); }
  }

  function pick(select: HTMLSelectElement) {
    const to = select.value;
    select.value = name; // the open ledger shows until the page reloads onto another
    if (to === NEW) act(() => { shell.ledgerDialog = true; });
    else if (to !== name) act(() => void go(to));
  }
</script>

{#if name}
  <span class={row ? 'vb-menu-item vb-menu-face vb-ledger-row' : 'vb-path-part vb-menu-face vb-ledger-chip'} data-look={look}
    title={going ? ledgerWords.opening(going) : ledgerWords.ledgerChoose(name)} aria-busy={going ? true : undefined}>
    <ButtonIcon name="ledger" />
    {#if row}
      <span class="vb-menu-label">{row}</span><span class="vb-menu-value">{going ? ledgerWords.opening(going) : name}</span>
    {:else}
      <span class="vb-ledger-name">{going ? ledgerWords.opening(going) : name}</span><ButtonIcon name="chevron" />
    {/if}
    <select {id} class="vb-menu-over" aria-label={chromeCommonWords.ledger} value={name} disabled={!!going} onchange={(e) => pick(e.currentTarget)}>
      {#each ledgers as l (l.name)}
        <option value={l.name}>{ledgerWords.ledgerOption(l.name, l.boards, l.keptOutOfGit)}</option>
      {/each}
      <hr />
      <option value={NEW}>{ledgerWords.newLedger}</option>
    </select>
  </span>
{/if}
