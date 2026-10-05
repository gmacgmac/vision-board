// Region pattern icons: the mode row's five layout icons and the cog, 24 x 24 stroke paths taken
// from mockup 05's i-grid, i-flow, i-lanes, i-radial, i-list and i-cog symbols. Paths only;
// region-template.ts wraps them with the node pattern's `svgIcon`, and region.css draws them.
// Typed on `Mode`, so a new mode fails to compile here until it has an icon.
import type { Mode } from '../../../format/src/index.ts';

export const MODE_ICON: Record<Mode, string> = {
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/>'
    + '<rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  flow: '<rect x="2.5" y="9" width="6" height="6" rx="1.5"/><rect x="15.5" y="3.5" width="6" height="6" rx="1.5"/>'
    + '<rect x="15.5" y="14.5" width="6" height="6" rx="1.5"/><path d="M8.5 12H12V6.5h3.5M12 12v5.5h3.5"/>',
  lanes: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/>'
    + '<rect x="3" y="16" width="18" height="4" rx="1.5"/>',
  radial: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="4" r="1.6"/><circle cx="19.5" cy="9.5" r="1.6"/>'
    + '<circle cx="16.8" cy="18.5" r="1.6"/><circle cx="7.2" cy="18.5" r="1.6"/><circle cx="4.5" cy="9.5" r="1.6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
};

/** The container settings cog. */
export const COG_ICON = '<circle cx="12" cy="12" r="3"/>'
  + '<path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>';
