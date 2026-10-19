// Node pattern: a moment in the person's own clock, the one home for how the board words a time.
// `versionTime` is the version dropdown's, the banner's and a proposal's ("Oct 18, 09:10");
// `noteTime` is a note's or a reply's on its card (card-polish FE_02), and the history box's (FE_03):
// "Today 09:42" or "Yesterday 18:10" when it can, else `versionTime`; `fullTime` is the whole date
// and time, for a `title`. Pure: the caller passes `now`, so a test fixes it.

/** A time as the version dropdown and the banner show it, in the person's own clock. */
export const versionTime = (at: string): string =>
  new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const clock = (d: Date): string => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Whether `a` and `b` fall on the same day in the person's clock. */
const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

/** "Today 09:42", "Yesterday 18:10", else `versionTime` ("Oct 18, 09:10"). */
export function noteTime(at: string, now: Date): string {
  const d = new Date(at);
  if (sameDay(d, now)) return `Today ${clock(d)}`;
  const before = new Date(now);
  before.setDate(before.getDate() - 1);
  return sameDay(d, before) ? `Yesterday ${clock(d)}` : versionTime(at);
}

/** The whole date and time ("Sunday, 19 October 2026 at 09:42" in the person's words), for a `title`. */
export const fullTime = (at: string): string => new Date(at).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
