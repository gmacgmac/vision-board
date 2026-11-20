# VERIFY_01: Verify

**Objective**: One check per ruling (PLAN.md Decisions 1-8), then the full page suite once. **Port**: `VB_TEST_PORT=6500`

## Steps
1. For each decision, name the test that holds it and run it; a decision with no test is a finding.
2. Full page suite (`--config tests/pages/playwright.config.ts`), budgets with `--project budgets --no-deps` if the
   chromium project had a flake; `npm run verify`; `npm run check`.
3. In a browser, light and dark: a container with two holders shows one chip; its list opens by hover and keyboard.
4. Report failures with output. Fix nothing; list requests.

## Implementation Notes (2026-11-20, VERIFY_01 executor)

**Per decision (test: result)**
- 1 `bot-tool-rules.test.ts` "reads say who you are: `you` for a joined agent, `joined: false`…"; "standalone, through vb-mcp: a read sends the secret…" (+ `packages/mcp/tests/session.test.ts`, `api-identity.test.ts`): pass.
- 2 `bot-tool-rules.test.ts` "request_grant agrees with the read…" and "reads tell the truth at every tier…": pass.
- 3 same "reads tell the truth at every tier" (asserts the tier line in `get_board`) and `plugin-skill.test.ts`: pass.
- 4 eval `other-container` (tests/evals/bot, good and bad fake scripts, in the eval suite): pass; live Haiku not re-run here.
- 5 `api-chat-identity.test.ts` (4 tests) and `api-chat-sessions.test.ts`: pass.
- 6 skill text (`plugin-skill.test.ts`, skill build equals disk): pass. No test asserts the Decision 6 wording itself (finding).
- 7 `send-access.spec.ts` gallery chip (light, dark), keyboard chip test, `region-template.test.ts`: pass; browser look done.
- 8 `scripts/verify-style.test.mjs` "print-safe:" (2), `container-rules.spec.ts` "corners only": pass.

**Suites**: node `npm test` 2820/2821 (fail: `plugin-build.test.ts` bundle budget, `view/board.js` 209701 gzip over 209500); `test:timing` 15/15 (run separately, as `&&` skipped it); pages 1142 passed, 5 failed, 2 skipped, 10 did not run; the 5 fail again alone (chromium, `--no-deps`); budgets 10/10; `npm run verify` ok (50 warnings; plugin dist not built so its print-safe check skipped); `npm run check` 0 errors.

**Failures**
1. `send-access.spec.ts:283` "keyboard: Tab reaches Allow, and Enter allows": chip name expected "2 agents have access", received "3 agents have access" (the chip counts one more holder than the test expects).
2-5. `timeline.spec.ts:442` "the container across and down" (default and command-lens, light and dark): screenshot diff of 335-344 px at the container title line (the holders chip is now drawn there); screenshots stale.

**Browser look** (gallery, port 6590, light and dark): holders chip shows person icon and count; hover opens the list, creator marked with no Remove, others with Remove; focus shows the ring and list; Esc closes it (aria-expanded false); no-holder sample has no chip. No defects.
