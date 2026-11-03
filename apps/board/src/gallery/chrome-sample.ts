// What a gallery sample of the board's controls is mounted with (`mount`'s `context`): the page's flags, its
// parts drawn as samples, and nothing to tell. Each sample has its own state, at the status's start, or with `status` over it.
import { flagOn, isFlag } from '#format';
import { chromeContext, chromeState, type ChromeState, createChrome } from '../board/chrome/index.ts';
import { pageFlags } from '../flags.ts';
import { pageParts, type PagePartsOptions } from '../shell/page-parts.ts';

export function chromeSample(parts: Omit<PagePartsOptions, 'placement'> = {}, status: Partial<ChromeState> = {}) {
  const flags = pageFlags();
  return chromeContext(createChrome({
    settings: { get: (key) => (isFlag(key) ? flagOn(key, flags) : undefined), on: () => () => undefined },
    notify: () => undefined,
    page: { wanted: () => [], opened: () => undefined, restart: () => undefined, parts: pageParts({ placement: 'gallery', ...parts }) },
  }, document.documentElement, '', undefined, Object.assign(chromeState(), status)));
}
