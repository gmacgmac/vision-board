# Cortex — Registry

> **Seed-once** (yours; never overwritten) · **On-demand** (NOT resident — load when routing,
> filing, gardening, or checking the doc fence). Renames the old `ROUTES.md`.
> Because it isn't in-context every turn, it can grow without costing per-turn budget.
>
> Three blocks: `categories` (where each category lives), `docs` (the drift fence),
> `handlers` (how to act). The resolution algorithm itself lives in `router.md § Resolution` —
> this file is data, not mechanics.

---

## Categories

One DRY record per category. `concern` defaults to the name's prefix (before the first `-`);
declare it only to override. `subdomain` is inferred from the folder a file sits in — never listed.
Classification of a file = the **longest / most-specific** path match below.

```yaml
categories:
  # --- permanent (kernel) ---
  cortex-infra:       { virtual: true }          # a log tag, not a location — never path-matched.
                                                 # System content is discovered BY PATTERN
                                                 # (cortex-change-protocol § System files), so no
                                                 # paths are needed. Giving it paths would hand the
                                                 # Gardener a drift scope over the kernel — whose
                                                 # managed files `copier update` overwrites anyway.
  needs-human-input:  { virtual: true }          # a status, not a location — never path-matched

  # --- project ---
  board-app:        { paths: [apps/board/] }
  board-security:   { paths: [apps/board/server/guard.ts] }   # + the agent tool limits once packages/agent exists
  board-format:     { paths: [packages/format/] }
  board-actions:    { paths: [packages/actions/] }
  board-layout:     { paths: [packages/layout/] }
  board-ui:         { paths: [packages/ui/] }
  board-tokens:     { paths: [packages/tokens/] }
  board-agent:      { paths: [skills/] }                       # + packages/agent/, packages/cli/ when created (U2)
  project-docs:     { paths: [docs/, README.md, cortex-tasks/tracker.md] }
  project-tooling:  { paths: [scripts/, package.json, .npmrc, .nvmrc, .gitignore] }
```

---

## Docs (the drift fence)

Three tiers. `include` is the **only** list the Gardener may edit; everything else it can
see, it can only propose on. See `cortex-garden` SKILL.md § Scope tiers.

```yaml
docs:
  # TRACKED — read + fixable. Deliberately EMPTY on this project (maintainer, 2026-10-01):
  # the Gardener never edits docs here. Every doc worth watching is in `flag` instead.
  include: []

  # FLAGGED — read + drift-checked + reported as [needs-human-input] DRIFT lines; NEVER edited.
  # Fixes are coordinated with the developer.
  flag:
    - /README.md
    - /AGENTS.md
    - /CLAUDE.md
    - apps/board/README.md
    - packages/format/README.md
    - packages/actions/README.md
    - packages/layout/README.md
    - packages/ui/README.md
    - packages/tokens/README.md
    - docs/vision.md
    - docs/principles.md
    - docs/decisions.md
    - .kiro/steering/vision-board-proj.md
    - .kiro/steering/svelte-conventions.md
    - skills/vision-board/SKILL.md

  # A discovery HINT, not a live matcher. Proposals only.
  hint: "README.md in each apps/ and packages/ folder, docs/, and project (non cortex-*) steering files"

  # OFF-LIMITS — never drift-checked, never written. Kernel defaults; add project paths.
  exclude: [
    cortex/,                  # kernel + data — never project content
    cortex-tasks/,            # historical record; "fixing" a completed task destroys the audit trail
    "**/cortex-*",            # kernel skills/rules/steering mirrored into .agent/ .claude/ .kiro/ —
                              # matched by PATTERN, not by tree, so a project-specific file sharing
                              # the same folder (e.g. .kiro/steering/{project}-info.md) stays
                              # Observable and driftable
    prototypes/,              # reference copy of Uplynk Architect, read only
    sessions/,                # local board data, not committed
    temp/,                    # interim files
  ]
```

> **`exclude` means "never drift-checked", not "never read."** The Gardener must read
> `cortex/PROFILE.md`, `REGISTRY.md` and `router.md` — they are its own configuration. What it must
> not do is treat them as docs to audit and correct. `cortex/` is excluded wholesale because nothing
> project-specific ever lives there. `.kiro/`, `.agent/`, `.claude/` are **not** excluded wholesale —
> only the `cortex-*`-prefixed files inside them (the kernel's own rules/skills/steering, and their
> generated `.agent/`/`.claude/` mirrors) are, because those are overwritten by `copier update` and a
> fix there silently reverts. Everything else in those trees — project-authored rules, skills, and
> steering — is ordinary project content and stays in scope. `PROFILE`/`REGISTRY` themselves change
> only via the ratification loop (`cortex-garden` engine.md), never a doc-drift fix.

> `cortex/LOG.md` and `cortex/AUDITED.md` are a further exception: the Gardener edits them, but
> **only** via its defined mechanics (remove a processed thread's entries, append a checkpoint).
> Never drift-check or rewrite them.

> **Prose / non-code repos**: the default `hint` finds nothing useful, and declaring the tree
> broadly would swallow the content. Track the authoritative docs (a style guide, an outline,
> a conventions file) and `exclude` the content itself. A chapter is content, not documentation
> *of* something — drift-checking it is a category error.

---

## Handlers (how to act)

Default for any category = the `cortex-garden` drift/ripple check. Add entries only to
override that. System skills match by their own descriptions — do not duplicate them here.

```yaml
handlers:
  # intent -> skill/handler path
  # "process inbound": cortex-route
  # "sync api docs":   handlers/api-doc-sync.md
  # category overrides (run instead of / after the default drift check):
  # {project}-api:     handlers/api-doc-sync.md
```
