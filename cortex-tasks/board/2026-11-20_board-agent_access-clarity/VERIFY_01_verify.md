# VERIFY_01: Verify

**Objective**: One check per ruling (PLAN.md Decisions 1-8), then the full page suite once. **Port**: `VB_TEST_PORT=6500`

## Steps
1. For each decision, name the test that holds it and run it; a decision with no test is a finding.
2. Full page suite (`--config tests/pages/playwright.config.ts`), budgets with `--project budgets --no-deps` if the
   chromium project had a flake; `npm run verify`; `npm run check`.
3. In a browser, light and dark: a container with two holders shows one chip; its list opens by hover and keyboard.
4. Report failures with output. Fix nothing; list requests.
