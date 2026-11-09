# The host contract and its checks, copied for the tests

`nclite/` holds byte-for-byte copies of a host's plugin contract and the code the host runs to check a plugin against it,
at the same paths as in the host's repo, so their imports resolve unchanged. It is a **test fixture, not the spec**: the
board's own types are made from its code (`plugin.d.ts`, `docs/specification/plugin.md` § The types and the seam
version), and the tests run the host's own checks on the board's build, so the day the two drift, a test fails. Nothing
in `apps/` or `packages/` imports it.

Source: the nclite repo (`/Users/dev/AI/nclite`), read only. nclite HEAD when copied: `dde6d037ae1ff6fad2f6b38b388b42a15978f725`
(2026-11-09).

| Copy | Source sha256 | Last changed in nclite |
|---|---|---|
| `nclite/shared/plugin-host.ts` | `b63e2a3f0ce3c228f37bd552380056d8a101a45733a53ce9616d3eb4bf0f365e` | `5671453f` |
| `nclite/shared/plugin-checks.ts` | `8280e7f38d506e546946a7d8789e566712d10c06f1c7dfd8558cf6a9eaab0015` | `5671453f` |
| `nclite/shared/plugin-adapters.ts` | `d09828aba739f26c3368f1456c59b68206f72489ec8ce5badb619c0e69f5b040` | `5671453f` |
| `nclite/engine/plugins/stylesheet.ts` | `1b2b91b54bb83857b19fb54db3a9ef05fc4f809612a55a4f2fc83793503ffc15` | `5671453f` |
| `nclite/engine/plugins/provenance.ts` | `6efaa8ae7c9c66e4353bfd530eb057c72337e52b3a2408a90d221294144278ec` | `673ff140` |
| `nclite/engine/words/plugins.ts` | `d1696fb3bc281ca7554eef25f7af9460bfb60846415056b4b325ee089b356027` | `5671453f` |

nclite has vendored the board (its `5671453f`): the copies hold the manifest's `scope`, the change key `plugin/change`
(the board's own), and the adapter table's one entry for the board, its icon.

**One edit, held by a test: the host's `pageChanged` (nclite item 160).** nclite adds the member to `PluginHost` when it
vendors the build that calls it (its handover `temp/panel-layout/plugin-handover-160.md`). In
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
seam 2 still. `plugin-host.test.ts` undoes it before it checks the sha256 above.

`plugin-host.test.ts` holds this table: every copy is its source's bytes, by the sha256 above, once the edits are undone. It catches an edit to a
copy, not a change in nclite: that shows only when the copies are refreshed (below), so refresh them before each handover.

## Refreshing it

1. Copy each file in the table from the nclite repo to the same path under `nclite/`. Once nclite has
   `pageChanged`, drop the edit above and its line in `plugin-host.test.ts` `EDITS`.
2. Set the HEAD (`git -C /Users/dev/AI/nclite rev-parse HEAD`), each sha256 (`shasum -a 256`) and each last change
   (`git -C /Users/dev/AI/nclite log -1 --format=%h -- <file>`) above.
3. Run `node --test tests/plugin/contract/plugin-host.test.ts`, then `npm test` and `npm run test:plugin`. A type test that
   fails is the contract moving under the board: a member taken out or renamed, or a bound made tighter, raises the
   board's `SEAM` (`apps/board/plugin/seam.ts`). A check that fails is the host asking more of the board.
