---
inclusion: always
---

> **Version**: 2.9 | **Updated**: 2026-10-21

0. When writing documentation or comments, NEVER include PII as examples. Always use non-identifiable examples.
1. We opt for Concise Code
2. We try to avoid over engineering as much as possible
3. We try to re-use code and patterns as much as possible
4. Naming Conventions: Name modules, components, and systems using standard, industry-recognized terminology that describes what they do. Avoid metaphorical or invented names unless the term is already an established convention in that ecosystem. If no standard term fits, ask the user rather than inventing one.
5. We strategise plans
6. We do not assume that a "question" requires an action. The user will indicate if action must be taken.
7. When coding, be very mindful of the depth of the application for which you might be adding features. Consider if "this" could be a breaking change.
8. Any interim test file that are NOT part of a test suite must be written to workspace  `temp` folder at the root of the project. If it doesn't exist, then add the folder. DO NOT scatter tests all over the project. If you must, ensure you tidy up.
9. Report ANY issues you encounter during task or skill completions or general coding to the human. They might require you log a `[needs-human-input]` item to the LOG.
10. Long File Strategy (survival-critical): a single write that runs ~60s can break the connection, after which you loop on connection resets and ALL work in that call is lost on cancel. This is disastrous for sub-agents. So: any write >50 lines MUST be CREATEd with the first section only, then APPENDed in chunks. If you ever see repeated connection-reset errors, STOP immediately — do NOT retry in a loop. Report it as a Long File Strategy violation and switch to chunked appends.
10a. Command Execution: always pass the working directory via the `cwd` parameter rather than prefixing commands with `cd /path &&`. Only use a `cd` prefix when a tool genuinely has no `cwd`/working-directory option (e.g. it's disallowed by command allowlisting).
11. Dependency Supply Chain Security: Treat all package installs across ALL ecosystems as high-risk.
   NPM: ALWAYS remove ^ and ~ from package.json. Audit preinstall/postinstall scripts on unknown packages.
   PyPI: Pin exact versions in requirements.txt and pyproject.toml (no >=, ~=, or *). Avoid installing unverified packages.
   Docker: Pin base images by digest (sha256:...), not mutable tags. Verify image provenance.
   GitHub Actions: Pin actions by full commit SHA, not tag. Tags can be force-pushed (ref: Trivy/TeamPCP March 2026).
   Credential Safety: Never expose environment variables or secrets during any install or build process.
   Context: The March 2026 TeamPCP campaign compromised Trivy, npm packages, Checkmarx KICS, and litellm on PyPI in a single week-long chain.
12. Some agents like KIRO do NOT read the `.agent/` folder by default, so Cortex ships Kiro steering files under `.kiro/steering/`. The rule files are self-contained; `cortex-profile` links its source with Kiro's file-include directive (to `cortex/PROFILE.md`). You MUST ALWAYS read any linked target files.
13. Grounding (reputation-critical): classify output CREATIVE or GROUNDED before writing.
   CREATIVE (ideation, naming, tone) — grounding optional.
   GROUNDED (sales, pricing, accounting, math, legal, RFP, compliance, client-facing,
   or ANY claim about existing code/docs/data) — grounding MANDATORY: cite every assertion (`file` + symbol, doc+section,
   or URL); NEVER bridge a gap with a plausible sentence — state "not established in sources"; mark derived conclusions `[INFERENCE]`, kept separate from sourced facts; quote source text beside any number, date, or legal term; show arithmetic with cited
   inputs; self-audit before delivering — strike any unsourced declarative. Unsure → GROUNDED.
14. Never hand-edit copier-managed kernel files (see `cortex-change-protocol.md` § Before editing).

## SUB-AGENT PROTOCOL
1. If the user explicitly asks you to "spawn sub-agents" or "use sub-agents" or some derivative thereof, you MUST delegate to your environment's general-purpose sub-agent (whatever your current tool calls it). Do NOT do the work directly yourself.
2. If a skill file (`.kiro/skills/*/SKILL.md`) instructs you to use sub-agents, you MUST follow that instruction. The skill file is authoritative — do not override it by doing the work directly.

CONFIRMATION PROTOCOL:
1. If I ask for a "strategy", "plan", "review", or "investigation", you must output TEXT ONLY.
2. You are STRICTLY FORBIDDEN from modifying ANY files or making ANY changes until I explicitly give permission to proceed.
3. If you formulate a plan, you must STOP and ask: "Shall I proceed with this implementation?"
4. NEVER assume implied consent. If the prompt does not explicitly order code changes, DO NOT touch the file system.

## CONVERSATIONAL & INTERVIEW PLANNING PROTOCOL
When engaging in interview, strategy, planning, or discovery (i.e., not executing a predefined task):
0. **Style**: In conversation and discussions, use brief concise plain english points to explain or convey information. Provide "SHORT" responses. Use bullets where appropriate.
1. **Single Thread Focus**: Discuss one topic or question at a time. Do not overload the context with multiple forward-looking questions.
2. **Step-by-Step**: Wait for the user's answer/confirmation before introducing the next set of questions or topics.
3. **Adaptive Context**: Recognize that the direction may change based on the immediate answer, so future planning should remain flexible and not be pre-generated in bulk.
