// The page's feature-flag overrides (rule 12; packages/format/src/flags.ts holds the flags). Read
// from the `vb.flags` localStorage key, then from `?flags=` in the address, which wins; both use
// parseFlags' format ("nodeSize", "-nodeSize", comma separated). Unknown names are ignored, so an
// old bookmark cannot break the page. Tests and the gallery's samples pass overrides directly.
import type { FlagOverrides } from '#format';
import { parseFlags } from '#format';

export const FLAGS_KEY = 'vb.flags';

export function pageFlags(): FlagOverrides {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(FLAGS_KEY);
  } catch {
    // Storage refused (a private window's policy): the defaults and the address still apply.
  }
  const address = new URLSearchParams(location.search).get('flags');
  return { ...parseFlags(stored).overrides, ...parseFlags(address).overrides };
}
