// What only the standalone page has in the board's header (host.ts `BoardPageParts`): its Theme and Centre
// cards, its folder, its ledger, the ledger's read-only state and Edit and its Chat button. Each is the page's own
// Svelte, mounted in the element the header gives, reading the page's state. The page's flags decide which exist,
// except what the server says: the ledger's three parts are there while the server names a ledger, whatever the
// page's own ledgerFolders flag (M51, PLAN decision 3): getters reading the folder the page read (shell.svelte.ts),
// so the header, its "⋯" rows and tooltip follow it. The gallery passes its samples' folder and placement; there the
// page's flags decide which samples show, the ledger's too.
import { type Component, mount, unmount } from 'svelte';
import { flagOn } from '#format';
import type { BoardPageParts, PagePart } from '../board/host.ts';
import * as chromeCommonWords from '../board/words/chrome-common.ts';
import * as toolbarWords from '../board/words/toolbar.ts';
import { pageFlags } from '../flags.ts';
import AlignRow from './AlignRow.svelte';
import ChatButton from './ChatButton.svelte';
import EditButton from './EditButton.svelte';
import EditChip from './EditChip.svelte';
import { editingOn } from './editing.ts';
import { currentFolderOn, openFolderOn } from './folder.ts';
import FolderPart from './FolderPart.svelte';
import FolderRow from './FolderRow.svelte';
import LedgerPart from './LedgerPart.svelte';
import LedgerRow from './LedgerRow.svelte';
import type { FolderInfo } from './page-io.ts';
import { shell } from './shell.svelte.ts';
import ThemeControl from './ThemeControl.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each part's own props, given as they are
const draw = (part: Component<any>, props: object = {}): PagePart => (target, args) => {
  const drawn = mount(part, { target, props: { ...props, ...args } });
  return () => { void unmount(drawn); };
};

export interface PagePartsOptions {
  /** The gallery's samples: no ids of the page's. */
  placement?: 'board' | 'gallery';
  /** The open folder under Open folder… (the gallery's); left out, the page's own. */
  folder?: Pick<FolderInfo, 'path' | 'name'> | null;
  /** The folder the header's chip and row show (the gallery's); left out, the page's own. */
  chip?: Pick<FolderInfo, 'path' | 'name'>;
  /** Show the Current line under Open folder… (the gallery's); left out, the currentFolder flag. */
  current?: boolean;
  /** Draw Chat with the chatPanel flag off (the gallery's). */
  chat?: boolean;
  /** The ledger the header's chip, row and New ledger… show (the gallery's); left out, the page's own. */
  ledger?: Pick<FolderInfo, 'ledger' | 'ledgers' | 'boards'>;
  /** The ledger's state the chip and Edit show (the gallery's); left out, the page's own. */
  editing?: Pick<FolderInfo, 'readOnly' | 'editing'>;
}

export function pageParts({ placement = 'board', chat = false, chip, ledger, editing, ...sample }: PagePartsOptions = {}): BoardPageParts {
  const flags = pageFlags();
  const folderOn = openFolderOn();
  /** The page's own ledger parts follow its server alone; a gallery sample's, as every sample there, the page's flag too. */
  const ledgersOn = folderOn && (placement === 'board' || flagOn('ledgerFolders', flags));
  /** The server names a ledger (the gallery's sample, else the page's folder): read where the header draws. */
  const named = () => ledgersOn && !!(ledger === undefined ? shell.folder : ledger)?.ledger;
  const ledgerChip = draw(LedgerPart, { folder: ledger });
  const ledgerField = draw(LedgerPart, { folder: ledger, row: chromeCommonWords.ledger });
  const ledgerRow = draw(LedgerRow, { placement, folder: ledger });
  return {
    theme: draw(ThemeControl, { placement, ...(placement === 'gallery' && { theme: 'system' }) }),
    ...(flagOn('alignSetting', flags) && { alignRow: draw(AlignRow, { placement }) }),
    ...(folderOn && { folderRow: draw(FolderRow, { placement, ...sample }) }),
    ...(currentFolderOn() && {
      folderChip: draw(FolderPart, { folder: chip }),
      folderField: draw(FolderPart, { folder: chip, row: toolbarWords.folder }),
    }),
    get ledgerChip() { return named() ? ledgerChip : undefined; },
    get ledgerField() { return named() ? ledgerField : undefined; },
    get ledgerRow() { return named() ? ledgerRow : undefined; },
    // A gallery sample shows only the state it is given: none draws nothing, and nothing reads the page's folder.
    ...(editingOn() && {
      editChip: draw(EditChip, { folder: placement === 'gallery' ? editing ?? null : editing }),
      editButton: draw(EditButton, { folder: placement === 'gallery' ? editing ?? null : editing }),
    }),
    ...((chat || flagOn('chatPanel', flags)) && { chat: draw(ChatButton, { menu: flagOn('toolbarMenu', flags), placement }) }),
  };
}
