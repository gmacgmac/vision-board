# The host contract, a copy for the tests

`plugin-host.ts` here is a copy of a host's plugin contract, the shapes the board's seam is built to
(`docs/specification/plugin.md`). It is a **test fixture, not the spec**: the board's own types are made from its code
(`plugin.d.ts`, § The types and the seam version), and the tests compile them against this copy, so the day the two
drift, a test fails. Nothing in `apps/` or `packages/` imports it.

| | |
|---|---|
| Source | `shared/plugin-host.ts` in the nclite repo (`/Users/dev/AI/nclite`), read only |
| nclite commit | `a975c1ca361645d3c2e854a91d88fe7a254901f0` (HEAD when copied, 2026-11-07; the file last changed in `da90f265d26bba450cc193a356ea54ecc83aa02a`) |
| Source sha256 | `63622aada38a5024b2638754dca79ba656c2643af6cde658e3c1bce7a1ffe275` |
| The one change | `CHANGE_META` is `'plugin/change'`, where the source has `'nclite/change'`: the change key is neutral (the plugin-contract set's PLAN, Decision 5), and the handover asks nclite to rename it. The line carries a comment saying so. Nothing else differs |

`plugin-host.test.ts` holds this table: the copy with that one line put back is the source's bytes, by the sha256 above,
and the key is `plugin/change`.

## Refreshing it

1. `cp /Users/dev/AI/nclite/shared/plugin-host.ts tests/plugin/contract/plugin-host.ts`
2. Make the one change again: the `CHANGE_META` line exactly as it stands in the copy you replaced (until nclite has
   renamed the key; then there is no change, and this README and the test say so).
3. Set the commit (`git -C /Users/dev/AI/nclite rev-parse HEAD`) and the sha256 (`shasum -a 256` of the source) above.
4. Run `node --test tests/plugin/contract/plugin-host.test.ts`, then `npm test` and `npm run test:plugin`. A type test that
   fails is the contract moving under the board: a member taken out or renamed, or a bound made tighter, raises the
   board's `SEAM` (`apps/board/plugin/seam.ts`).
