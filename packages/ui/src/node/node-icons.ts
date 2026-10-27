// Node pattern icons: presentation keyed by type lives in packages/ui (components.md § The
// node-type registry). Records keyed by Kind, so the compiler fails when a kind is added without
// its icon. Paths only; node-template.ts wraps them in <svg>. Stroke icons, drawn by node.css.
import type { ActionId, Kind } from '#format';

/** The kind's icon in the card footer, 24 x 24. Redrawn from the board-v3 mockups' i-<kind>. */
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

/** The quick-action buttons' icons, 20 x 20. */
export const ACTION_ICON: Partial<Record<ActionId, string>> = {
  ack: '<path d="M4 10.5l4 4 8-9"/>',
  drop: '<path d="M5 5l10 10M15 5L5 15"/>',
  comment: '<path d="M4 5h12v8H9l-4 3v-3H4z"/>',
  context: '<path d="M7.5 7.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V12M10 15v.01"/>',
  later: '<path d="M6 4h8v12l-4-3-4 3z"/>',
};

/** The flag button's icon, 20 x 20 like the action icons (cardFlag flag): a pole and its cloth. The
 * cloth (`vb-flag-cloth`) fills in while the card is flagged (node.css). */
export const FLAG_ICON = '<path d="M5.5 17.5v-14"/><path class="vb-flag-cloth" d="M5.5 4h9.5l-2.5 3.75L15 11.5H5.5z"/>';

/** The history button's icon, 20 x 20 like the flag (card-polish FE_03): ⓘ, a circle and an i. */
export const INFO_ICON = '<circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.25v.01"/>';

/** The size control's glyph, 24 x 24: a width between two bars (mockup 07, i-size). */
export const SIZE_ICON = '<path d="M3 5v14M21 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>';

/** One icon as an inline SVG, hidden from assistive tech (the button or card carries the label). */
export const svgIcon = (paths: string, box: number, cls: string): string =>
  `<svg class="${cls}" viewBox="0 0 ${box} ${box}" aria-hidden="true" focusable="false">${paths}</svg>`;
