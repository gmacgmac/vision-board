// A small seeded random generator (mulberry32) for the property tests, so a failing sequence can
// be replayed from its seed: the layout cache's (layout-cache.test.ts) and the page's
// (tests/pages/same-picture.spec.ts).
export interface Random {
  next(): number;
  int(n: number): number;
  pick<T>(xs: readonly T[]): T;
}

export function seeded(seed: number): Random {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n), pick: (xs) => xs[Math.floor(next() * xs.length)]! };
}
