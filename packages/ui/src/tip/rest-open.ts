// The open wait every control shares that opens something when the pointer rests on it (never at once, so a pointer
// crossing it opens nothing): the layout button's popover (region/region-row.ts) and the answer disc's picker (the
// board's mark-acts.ts, D-112). What opens this way closes after the close grace once the pointer leaves
// (close-grace.ts). Touch has no rest: a tap opens it, as a click does.

/** How long a pointer rests on the control before what it opens opens, in ms. */
export const REST_OPEN_MS = 400;
