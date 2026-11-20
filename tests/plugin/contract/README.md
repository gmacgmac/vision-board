# The host contract and its checks, copied for the tests

`nclite/` holds byte-for-byte copies of a host's plugin contract and the code the host runs to check a plugin against it,
at the same paths as in the host's repo, so their imports resolve unchanged. It is a **test fixture, not the spec**: the
board's own types are made from its code (`plugin.d.ts`, `docs/specification/plugin.md` § The types and the seam
version), and the tests run the host's own checks on the board's build, so the day the two drift, a test fails. Nothing
in `apps/` or `packages/` imports it.

Source: the nclite repo (`/Users/dev/AI/nclite`), read only. nclite HEAD when copied: `9ee6202283c91a8a887bfe4ec6fc973f6b13ebc3`
(2026-11-20).

| Copy | Source sha256 | Last changed in nclite |
|---|---|---|
| `nclite/shared/plugin-host.ts` | `b4287e8cdd1434d01dc9860768492e49f68a16b31c124de9508ec8fc3e971d86` | `9ee62022` |
| `nclite/shared/plugin-checks.ts` | `8280e7f38d506e546946a7d8789e566712d10c06f1c7dfd8558cf6a9eaab0015` | `5671453f` |
| `nclite/shared/plugin-adapters.ts` | `d09828aba739f26c3368f1456c59b68206f72489ec8ce5badb619c0e69f5b040` | `5671453f` |
| `nclite/engine/plugins/stylesheet.ts` | `fe8798682e7a93104bc81cc42031eb390376da543d6f9de2c879c9781afa85a2` | `9ee62022` |
| `nclite/engine/plugins/provenance.ts` | `9cc2f5fa3bb729e36124379133418aace65c6250cac18a2adb0448db28e080e8` | `2f3ca585` |
| `nclite/engine/words/plugins.ts` | `05ed9b8d6ff668aab667abfb439af11d3471e31c64bc1f46e25bcff284f30ce4` | `9ee62022` |

nclite has vendored the board (its `5671453f`): the copies hold the manifest's `scope`, the change key `plugin/change`
(the board's own), and the adapter table's one entry for the board, its icon.

The copies are their sources' bytes, with no edit: nclite's `PluginHost` holds `pageChanged` (its item 160) and the
optional `savePdf(ask)` (ADR-0381: Save as PDF replaced printing; the old `print` alias is gone since its `6d2ac6b3`),
`saveFile` and `openFile` with `PdfAsk` (with `size`, one page of exactly that size), `PrintLook`, `PrintOrientation`,
`OpenedFile` and `FILE_LIMITS`. The board's own `BoardHost` keeps `pageChanged`, `savePdf`, `saveFile` and `openFile`
optional (`apps/board/src/board/host.ts`), so a host without them still fits: additions, seam 2 still. It still allows the
deprecated `print`, which it never calls; the type test no longer compares it with the contract's. Since its
`9ee62022` (ADR-0382) a plugin brings its own faces: the manifest's optional `view.fonts`, `FONT_BYTES`, and a top-level
`@font-face` the stylesheet check takes (`checkFontFace`), which the board's build test runs on the built sheet.

`plugin-host.test.ts` holds this table: every copy is its source's bytes, by the sha256 above. It catches an edit to a
copy, not a change in nclite: that shows only when the copies are refreshed (below), so refresh them before each handover.

## Refreshing it

1. Copy each file in the table from the nclite repo to the same path under `nclite/`. An edit a copy must hold until
   nclite ships it goes in this README, word for word, and in `plugin-host.test.ts` `EDITS`; today there is none.
2. Set the HEAD (`git -C /Users/dev/AI/nclite rev-parse HEAD`), each sha256 (`shasum -a 256`) and each last change
   (`git -C /Users/dev/AI/nclite log -1 --format=%h -- <file>`) above.
3. Run `node --test tests/plugin/contract/plugin-host.test.ts`, then `npm test` and `npm run test:plugin`. A type test that
   fails is the contract moving under the board: a member taken out or renamed, or a bound made tighter, raises the
   board's `SEAM` (`apps/board/plugin/seam.ts`). A check that fails is the host asking more of the board.
