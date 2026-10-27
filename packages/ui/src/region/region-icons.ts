// Region pattern icons: the mode row's layout icons and the cog, 24 x 24 stroke paths taken from
// mockup 05's i-grid, i-flow, i-lanes, i-radial and i-cog symbols; column and row (field report
// batch 2 ruling 4) are a pair drawn in the same style: three cards stacked, three side by side. Paths only;
// region-template.ts wraps them with the node pattern's `svgIcon`, and region.css draws them.
// Typed on `Mode`, so a new mode fails to compile here until it has an icon.
import type { Mode } from '#format';

export const MODE_ICON: Record<Mode, string> = {
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/>'
    + '<rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  flow: '<rect x="2.5" y="9" width="6" height="6" rx="1.5"/><rect x="15.5" y="3.5" width="6" height="6" rx="1.5"/>'
    + '<rect x="15.5" y="14.5" width="6" height="6" rx="1.5"/><path d="M8.5 12H12V6.5h3.5M12 12v5.5h3.5"/>',
  lanes: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/>'
    + '<rect x="3" y="16" width="18" height="4" rx="1.5"/>',
  radial: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="4" r="1.6"/><circle cx="19.5" cy="9.5" r="1.6"/>'
    + '<circle cx="16.8" cy="18.5" r="1.6"/><circle cx="7.2" cy="18.5" r="1.6"/><circle cx="4.5" cy="9.5" r="1.6"/>',
  // Small cards, not lanes' full-width bands: one under another, and one beside another.
  column: '<rect x="8" y="2.5" width="8" height="5.5" rx="1.5"/><rect x="8" y="9.25" width="8" height="5.5" rx="1.5"/><rect x="8" y="16" width="8" height="5.5" rx="1.5"/>',
  row: '<rect x="2.5" y="8" width="5.5" height="8" rx="1.5"/><rect x="9.25" y="8" width="5.5" height="8" rx="1.5"/><rect x="16" y="8" width="5.5" height="8" rx="1.5"/>',
};

/** The Match card widths switch (field report batch 3 ruling 5): three cards between two rules, all
 * one width (match), or ragged from one rule (own); the switch shows the one in force. */
export const WIDTHS_ICON = {
  match: '<path d="M3 3v18M21 3v18"/><rect x="6" y="4" width="12" height="4" rx="1.5"/><rect x="6" y="10" width="12" height="4" rx="1.5"/>'
    + '<rect x="6" y="16" width="12" height="4" rx="1.5"/>',
  own: '<path d="M3 3v18"/><rect x="6" y="4" width="12" height="4" rx="1.5"/><rect x="6" y="10" width="6" height="4" rx="1.5"/>'
    + '<rect x="6" y="16" width="9" height="4" rx="1.5"/>',
} as const;

/** The container settings cog. */
export const COG_ICON = '<circle cx="12" cy="12" r="3"/>'
  + '<path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>';

/** An eye, 20 x 20 like the action icons: the note preview's "Show in container" / "Hide"
 * (3_FE_04 step 4G ruling 2). Same stroke style; the mockups draw none. */
export const EYE_ICON = '<path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.2"/>';

/** The retired marker's narrow form (review polish round 2 ruling 1): a clock turning back, for "the
 *  version where they last appeared", beside the number when the line has no room for the words. */
export const RETIRED_ICON = '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><path d="M12 8v4l2.5 2"/>';
