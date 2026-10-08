// Gallery entry for a past version of the board (versionView flag, navigation FE_01): the banner
// that shows under the header while a past version is on show, read-only, with Back to now. It is
// the board's own Svelte component, mounted in the page flow with a fixed version, the gallery
// board's latest past one. Shown only with the flag on, so ?flags=-versionView draws the gallery as it was.
import { mount } from 'svelte';
import VersionBanner from '../shell/VersionBanner.svelte';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

export function versionSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'versionView';
  box.setAttribute('aria-labelledby', 'feature-versionView');
  const heading = el('h2', 'g-title', 'Past versions');
  heading.id = 'feature-versionView';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'VersionBanner'), ' · feature flag versionView, on by default · off with ?flags=-versionView');
  const host = el('div', 'g-banner');
  mount(VersionBanner, { target: host, props: { run: fx.pastVersion, placement: 'gallery', onback: () => undefined } });
  box.append(heading,
    el('p', 'g-desc', 'The toolbar\'s version dropdown lists the open board\'s versions: now, then each run of the agent\'s drawing, newest first. Choosing a past one shows the board as it was then, read-only.'),
    meta,
    group('Banner', 'Under the header while a past version shows: which version and when, and Back to now (Esc does the same). Every control that would act is hidden on the board meanwhile.', host));
  return box;
}
