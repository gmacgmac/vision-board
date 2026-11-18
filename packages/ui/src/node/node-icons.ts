// Node pattern icons: presentation keyed by type lives in packages/ui (components.md § The
// node-type registry). Records keyed by Kind, so the compiler fails when a kind is added without
// its icon. Paths only; `svgIcon` wraps them in <svg>. Stroke icons, drawn by the CSS of what holds them.
import type { ActionId, Kind } from '#format';

/** The kind's icon, 24 x 24: an app window's bar and an app's state view. Redrawn from the board-v3 mockups' i-<kind>. */
export const KIND_ICON: Record<Kind, string> = {
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.5M12 17h.01"/>',
  finding: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  decision: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  risk: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  action: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  topic: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  // The mockups have no note icon: a sheet with a folded corner, in the same stroke style.
  note: '<path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6"/>',
  // An app (D-047): a small window, its title bar and two buttons, in the same stroke style.
  app: '<path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M3 9h18M6.5 6.5h.01M9.5 6.5h.01"/>',
};

/** The actions' icons, 20 x 20: ✗ is every box's close, Comment a container's note button. */
export const ACTION_ICON: Partial<Record<ActionId, string>> = {
  drop: '<path d="M5 5l10 10M15 5L5 15"/>',
  comment: '<path d="M4 5h12v8H9l-4 3v-3H4z"/>',
};

/** One icon as an inline SVG, hidden from assistive tech (the button or card carries the label). */
export const svgIcon = (paths: string, box: number, cls: string): string =>
  `<svg class="${cls}" viewBox="0 0 ${box} ${box}" aria-hidden="true" focusable="false">${paths}</svg>`;
