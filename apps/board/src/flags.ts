// The page's feature-flag overrides (rule 12; packages/format/src/flags.ts holds the flags). Read
// from the `vb.flags` localStorage key, then from `?flags=` in the address, which wins; both use
// parseFlags' format ("nodeSize", "-nodeSize", comma separated). Unknown names are ignored, so an
// old bookmark cannot break the page. Tests and the gallery's samples pass overrides directly.
import type { FlagOverrides } from '#format';
import { flagOn, parseFlags } from '#format';
import { kept } from './shell/kept.ts';

export const FLAGS_KEY = 'vb.flags';

/** The page's flags as Markdown's options, for what the page draws itself: its chat, its gallery. */
export function pageMarkdown(): { images: boolean; svg: boolean } {
  const flags = pageFlags();
  return { images: flagOn('cardImages', flags), svg: flagOn('svgImages', flags) };
}

export function pageFlags(): FlagOverrides {
  const stored = kept(FLAGS_KEY); // storage refused (a private window's policy): the defaults and the address still apply
  const address = new URLSearchParams(location.search).get('flags');
  return { ...parseFlags(stored).overrides, ...parseFlags(address).overrides };
}
