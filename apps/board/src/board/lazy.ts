// Parts of the page that open on a person's action, kept out of its start weight (docs/specification/performance.md
// § What the page leaves out of its start weight): each is reached by one `import()`, so the build gives it a chunk of
// its own. Once the board has drawn, `loadPartsWhenIdle` loads them all while the browser has nothing else to do, so a
// first open seldom waits; one opened sooner loads then (chrome/Lazy.svelte). The chunks are the page's own, served by
// the board's server, so they load offline; the plugin's view is one file, where each is already inside.

/** A part loaded the first time it is wanted. */
export interface LazyPart<T> {
  /** The part, once loaded; null before. */
  readonly ready: T | null;
  /** Load it, once; a load that failed is tried again on the next call. */
  load(): Promise<T>;
}

const parts: LazyPart<unknown>[] = [];

export function lazyPart<T>(load: () => Promise<T>): LazyPart<T> {
  let ready: T | null = null;
  let loading: Promise<T> | null = null;
  const part: LazyPart<T> = {
    get ready() { return ready; },
    load: () => (loading ??= load().then((p) => (ready = p), (err: unknown) => { loading = null; throw err; })),
  };
  parts.push(part);
  return part;
}

/** Load every part once the browser is idle (after the board's first draw); a failure waits for the part's first use. */
export function loadPartsWhenIdle(): void {
  const all = () => { for (const p of parts) p.load().catch(() => undefined); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(all, { timeout: 2000 });
  else setTimeout(all, 200);
}
