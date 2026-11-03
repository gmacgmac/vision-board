// The board's controls (PLAN Decisions: Svelte, compiled inside the plugin's bundle): `mountChrome` draws
// them in `mount`'s root and gives back the stage they leave for the canvas. No Svelte type crosses this
// file to `mount.ts`. The gallery and the standalone page's own parts draw the same components from here.
import { mount, unmount } from 'svelte';
import type { BoardHost, BoardStore } from '../host.ts';
import type { BoardControls } from '../mount.ts';
import type { Status } from '../status.ts';
import BoardChrome from './BoardChrome.svelte';
import { createChrome } from './chrome.svelte.ts';

export interface MountedChrome {
  /** The element the board draws in. */
  stage: HTMLElement;
  unmount(): void;
}

export function mountChrome(root: HTMLElement, host: BoardHost, deps: { status: Status; ids: string; store: BoardStore; board: () => BoardControls | null; send: () => Promise<string | null> }): MountedChrome {
  const chrome = createChrome(host, root, deps.ids, deps.store);
  Object.assign(chrome.state, deps.status.now);
  const unhear = deps.status.on((patch) => Object.assign(chrome.state, patch));
  const drawn = mount(BoardChrome, { target: root, props: { chrome, board: deps.board, send: deps.send } });
  return {
    stage: root.querySelector<HTMLElement>(':scope > .vb-stage')!,
    unmount() { unhear(); void unmount(drawn); },
  };
}

export { default as BoardChrome } from './BoardChrome.svelte';
export { chromeContext, chromeState, createChrome, type ChromeState, type SendState } from './chrome.svelte.ts';
export { FULL_MIN, HALF_MIN, type HeaderTier } from './header-tier.ts';
export { toolbarPopup } from './toolbar-popup.svelte.ts';
export { default as AccessRequests } from './AccessRequests.svelte';
export { default as AppIcon } from './AppIcon.svelte';
export { default as ArchivedList } from './ArchivedList.svelte';
export { default as BoardAgents } from './BoardAgents.svelte';
export { default as ButtonIcon } from './ButtonIcon.svelte';
export { default as FlaggedChip } from './FlaggedChip.svelte';
export { default as GoToCard } from './GoToCard.svelte';
export { default as KeyHelp } from './KeyHelp.svelte';
export { default as LockedChip } from './LockedChip.svelte';
export { default as OpenChip } from './OpenChip.svelte';
export { default as ProposalsBar } from './ProposalsBar.svelte';
export { default as SendButton } from './SendButton.svelte';
export { default as Toolbar } from './Toolbar.svelte';
export { default as ToolbarEnd } from './ToolbarEnd.svelte';
export { default as ToolbarMenu } from './ToolbarMenu.svelte';
export { default as VersionBanner } from './VersionBanner.svelte';
