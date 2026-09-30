---
name: cortex-archive
description: "Retire or supersede content \u2014 move it into cortex/.archive/ with a dated header. Use when explicitly archiving/retiring a file, or when cortex-organize retires a doc or snapshots one before a major rewrite. NOT used before editing cortex/ or .kiro/ files \u2014 git is their history."
---

# Archive

Move a file into `cortex/.archive/` when it is retired or superseded, invoked by the `router.md`
retire/delete safety route or by `cortex-organize`.

> **Not a pre-edit snapshot tool.** Files under `cortex/`, `.kiro/`, and `.agent/` are never
> archived before a change — git is their history. The one snapshot case that remains is
> `cortex-organize` taking a `versioned` copy before a >20% rewrite of a doc-surface file.

## Inputs

- **Source file**: the file to archive.
- **Archive reason**: one of `superseded`, `versioned`, `retired`, `completed`, `obsolete`.
- **Replacement** (optional): the file that replaces this one.

## Archive reasons

| Reason | When |
|--------|------|
| `superseded` | A new file replaces this one |
| `versioned` | Snapshot before a significant update |
| `retired` | No longer needed |
| `completed` | One-time task finished |
| `obsolete` | Factually outdated |

## Location

Destination: `cortex/.archive/[YYYY]/`

## File naming

`[YYYY-MM-DD]-[reason]-[original-filename].md`

## Execution steps

1. **Validate source**: confirm the file exists.
2. **Ensure archive folder**: create `cortex/.archive/[YYYY]/` if missing.
3. **Copy or move**:
   - `versioned` → **copy** (original stays in place for editing).
   - All other reasons → **move** (original removed from its location).
4. **Prepend header** to the archived copy:
   ```
   > **Archived**: [YYYY-MM-DD] | **Reason**: [reason] | **Replaced by**: [replacement or "n/a"]
   ```
5. **Log**: append entry to `LOG.md` recording the archive action.

## Validation

- Archived file exists at the expected path in `cortex/.archive/[YYYY]/`.
- Header is present at top of archived file.
- Original is removed (unless reason is `versioned`).
