---
name: cortex-organize
description: "File new content into its correct home: classify the content, locate the right folder via PROFILE (\xA73 concerns / \xA75 doc surface), then create, update, or archive. Use when creating a doc or note and you need the correct destination, template, and no duplicates."
---

# Organize

Process user-provided information and route it to the correct documentation location with proper formatting. This is the skill that `router.md` and task templates point to for "file new content".

## Steps

### 1. Classify

1. Read `PROFILE.md` §2 — identify the primary category.
2. Determine destination: the concern folder (derived from the category-name prefix — see PROFILE Conventions) for tasks; the `REGISTRY.md` doc surface for docs.

**No category fits?**
- Learning Mode (`system_mode` in PROFILE §1): propose a new category via `[needs-human-input]`.
- Production Mode: log `[needs-human-input]` to `LOG.md`: "Structural Mismatch."

### 2. Locate (duplicate check)

Before creating new content:
1. Confirm the destination folder (`REGISTRY.md` docs for docs).
2. Search for existing docs in scope: filename search within the doc-surface folder(s), then content search if inconclusive.
3. Decision: **Create**, **Update**, or **Archive** based on findings.

### 3. Process

#### CREATE (new file)

1. Select a template from `cortex/templates/` by content type:
   - `generic-document.md` — default for notes, references, and general docs. For structured/technical docs (how something is built, a capability, a reusable pattern), use its optional section library instead of a separate template.
   - `handler.md` — a routine/procedure the router dispatches to.
   - `tracker-template.md` — a queue of open items for an ongoing effort; a row is deleted once its task completes.
   - `tasks/` — task planning and execution (usually via the `cortex-write-task` skill).
2. Match the format/structure of existing docs in this category.
3. If docs use frontmatter: generate frontmatter (category, last_updated, status, scope, keywords).
4. Format content. Name file (kebab-case).
5. Place inside a `REGISTRY.md` doc-surface folder — auto-included in the fence.
6. If no doc-surface folder covers this category, propose adding one to `REGISTRY.md` via `[needs-human-input]` — do not write outside the fence.

#### UPDATE (existing file)

1. Assess change magnitude.
2. If significant (>20%): invoke `cortex-archive` first (snapshot to `cortex/.archive/`).
3. Apply updates.
4. If the file uses frontmatter: update `last_updated`.

#### ARCHIVE (retire content)

1. Invoke `cortex-archive` skill (moves to `cortex/.archive/[YYYY]/`).
2. Moving it out of the §5 folder automatically removes it from the doc surface.

### 4. Validate

- Filename follows kebab-case convention.
- File is inside the correct `REGISTRY.md` doc-surface folder (docs) or derived concern folder (tasks).
- If frontmatter used: fields are populated.

**Log to `LOG.md`**: append an entry recording the action.
