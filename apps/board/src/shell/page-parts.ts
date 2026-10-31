// What only the standalone page has in the board's header (host.ts `BoardPageParts`): its Theme and Centre
// cards, its folder and its Chat button. Each is the page's own Svelte, mounted in the element the header gives,
// reading the page's state. The flags decide which exist; the gallery passes its samples' folder and placement.
import { type Component, mount, unmount } from 'svelte';
import { flagOn } from '#format';
import type { BoardPageParts, PagePart } from '../board/host.ts';
import * as toolbarWords from '../board/words/toolbar.ts';
import { pageFlags } from '../flags.ts';
import AlignRow from './AlignRow.svelte';
import ChatButton from './ChatButton.svelte';
import { currentFolderOn, openFolderOn } from './folder.ts';
import FolderPart from './FolderPart.svelte';
import FolderRow from './FolderRow.svelte';
import type { FolderInfo } from './page-io.ts';
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
}

export function pageParts({ placement = 'board', chat = false, chip, ...sample }: PagePartsOptions = {}): BoardPageParts {
  const flags = pageFlags();
  return {
    theme: draw(ThemeControl, { placement, ...(placement === 'gallery' && { theme: 'system' }) }),
    ...(flagOn('alignSetting', flags) && { alignRow: draw(AlignRow, { placement }) }),
    ...(openFolderOn() && { folderRow: draw(FolderRow, { placement, ...sample }) }),
    ...(currentFolderOn() && {
      folderChip: draw(FolderPart, { folder: chip }),
      folderField: draw(FolderPart, { folder: chip, row: toolbarWords.folder }),
    }),
    ...((chat || flagOn('chatPanel', flags)) && { chat: draw(ChatButton, { menu: flagOn('toolbarMenu', flags), placement }) }),
  };
}
