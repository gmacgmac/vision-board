# The host contract and its checks, copied for the tests

`nclite/` holds byte-for-byte copies of a host's plugin contract and the code the host runs to check a plugin against it,
at the same paths as in the host's repo, so their imports resolve unchanged. It is a **test fixture, not the spec**: the
board's own types are made from its code (`plugin.d.ts`, `docs/specification/plugin.md` § The types and the seam
version), and the tests run the host's own checks on the board's build, so the day the two drift, a test fails. Nothing
in `apps/` or `packages/` imports it.

Source: the nclite repo (`/Users/dev/AI/nclite`), read only. nclite HEAD when copied: `4356abee6a7fa57398b0c13f1e4595cb5aba84c6`
(2026-11-08).

| Copy | Source sha256 | Last changed in nclite |
|---|---|---|
| `nclite/shared/plugin-host.ts` | `63622aada38a5024b2638754dca79ba656c2643af6cde658e3c1bce7a1ffe275` | `da90f265` |
| `nclite/shared/plugin-checks.ts` | `db84025ebff710ad560d45bb74f8824efe790e659fbdf94755850b0f22a5f9d6` | `da90f265` |
| `nclite/engine/plugins/stylesheet.ts` | `6162e0e30cbf078375dcebc9e24b49debd4e582af6f269afa3365494954e92c9` | `673ff140` |
| `nclite/engine/plugins/provenance.ts` | `6efaa8ae7c9c66e4353bfd530eb057c72337e52b3a2408a90d221294144278ec` | `673ff140` |
| `nclite/engine/words/plugins.ts` | `6e1912fe725904777296fba04d174db155437a75e9f5d5611a736e01de547833` | `da90f265` |

**One stand-in, not a copy**: `nclite/shared/plugin-adapters.ts` holds only what the handover asks nclite to keep of
the board's entry, its icon (`'vision-board': { icon: 'board' }`), so `checkPluginStylesheet` runs as the host's loader
will. The real file imports the board's seam-1 adapter, which nclite deletes when it vendors this build.

**Edits for the manifest's `scope`, held by a test**: the contract has no `scope` in its manifest yet; nclite adds it when
it vendors this build (the handover), and the board's manifest carries `"scope": "vb"`. Two copies have the lines nclite
changes, and nothing else (`plugin-host.test.ts` undoes them and checks the source's sha256 above):

- `nclite/shared/plugin-host.ts`, `PluginManifest`: after `icon?: string;`, the line `scope?: string;`.
- `nclite/engine/plugins/stylesheet.ts`, `checkPluginStylesheet`: `(id: string, bytes: Uint8Array): string[] {` becomes
  `(id: string, bytes: Uint8Array, scope?: string): string[] {`, and `{ scope: css?.scope ?? id, reads:` becomes
  `{ scope: scope ?? id, reads:`. The caller passes the manifest's `scope`.

**Edit for the host's `pageChanged` (nclite item 160), held by the same test**: nclite adds the member to `PluginHost`
when it vendors the build that calls it (its handover `temp/panel-layout/plugin-handover-160.md`). In
`nclite/shared/plugin-host.ts`, `PluginHost`, after `imageRoute: string;` and before its closing `}`, word for word:

```ts
	/**
	 * Says that what `pageChip()` would answer may have changed: something else is on show, it emptied, or it filled.
	 * The host asks `pageChip()` again soon after and reads nothing from this call. Call it on every such change: the host
	 * coalesces calls. Never call it from `unmount` or after it.
	 */
	pageChanged(): void;
```

The board's own `BoardHost` has it optional (`apps/board/src/board/host.ts`), so a host without it still fits: an addition,
seam 2 still.

**One known difference, held by a test, never by an edit**: the board writes its change line under `plugin/change`
(`apps/board/server/engine/tools.ts` `CHANGE_META`); the contract still says `nclite/change`. nclite renames it in the
same change that vendors this build (the handover). `plugin-host.test.ts` "the one known difference" fails the day the
copy says `plugin/change`: then delete that test and the line in `apps/board/tests/plugin-types.test.ts` that moves the
change line under the contract's key.

`plugin-host.test.ts` holds this table: every copy is its source's bytes, by the sha256 above, once the edits are undone. It catches an edit to a
copy, not a change in nclite: that shows only when the copies are refreshed (below), so refresh them before each handover.

## Refreshing it

1. Copy each file in the table from the nclite repo to the same path under `nclite/`. Once nclite has the manifest's
   `scope` and `pageChanged`, drop those edits above and their lines in `plugin-host.test.ts` `EDITS`.
2. Set the HEAD (`git -C /Users/dev/AI/nclite rev-parse HEAD`), each sha256 (`shasum -a 256`) and each last change
   (`git -C /Users/dev/AI/nclite log -1 --format=%h -- <file>`) above.
3. Run `node --test tests/plugin/contract/plugin-host.test.ts`, then `npm test` and `npm run test:plugin`. A type test that
   fails is the contract moving under the board: a member taken out or renamed, or a bound made tighter, raises the
   board's `SEAM` (`apps/board/plugin/seam.ts`). A check that fails is the host asking more of the board.
