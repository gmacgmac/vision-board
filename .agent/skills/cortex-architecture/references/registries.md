# Registries: References, Conditions and Jobs

Replace scattered local checks with declared tables. **References** say who depends on whom
and hold no state. **Conditions** say what is true now. Root cause comes from walking one with
the other. **Jobs** say what is running now — added only when the project needs it.

The failure they prevent: the same fact re-derived in three places — a delete route, a banner
and a screen each decide "this is orphaned" — and the day a new kind is added, the copies
disagree.

## References — who depends on whom

One table of edges, declared once: `{ from: kind, to: kind, how to read the link }`.

- **Every "X refers to Y" is one row.** Adding a kind of link is one row and nothing else.
- **No state, no writes.** Queries are pure reads computed per request — "unavailable" is never
  stored, so it cannot go stale.
- **Two questions:** what points at this row (`dependents`), and what points at a row that is
  gone (`orphans`).
- **Deletes orphan, never cascade.** A dependant stays put, unavailable and saying why;
  re-creating the referent heals it with no repair pass.
- Kinds are a closed list (`as const`), so an unknown kind is a type error.

## Conditions — what is true now

One table keyed by condition kind, typed `Record<Kind, Row>` so a kind with no row is a compile
error, not a hole. Each row declares:

| Field | Meaning |
|---|---|
| `trueWhen` / `endsWhen` | One line each. A condition ends when its fact goes away — never by a write |
| `severity` | How loud |
| surfaces | Which places show it (toast, panel, status) — whether, not where |
| `scope` | Whose fact it is (one item's, or the whole install's) |
| `entity` | Which row the condition is about — the key to root cause |

Conditions are computed fresh from real state, each with a readable reason.

## Root cause

For each condition, take its `entity`, walk the reference edges to what it depends on, and point
it at the condition about that dependency. No scoring, no hand-written cause pairs. A surface
draws a symptom **under** its root, never on its own.

## Jobs — what is running now

Add it once two or more kinds of long-running work exist (downloads, imports, builds). Until
then, keep progress local.

One table keyed by job kind, typed `Record<Kind, Row>`. Each row declares its label, `scope`
(one item's, or the whole install's) and whether it can be cancelled. One tracker holds every
running job: started, progress, done, failed, cancelled.

- **Unlike the other two, it holds state.** Workers write to it; everything else only reads.
- **Callers use its interface** (start, update, finish, list), never its storage — so where jobs
  live can change without touching a caller.
- **It reports; it doesn't schedule.** A queue still decides what runs next.
- **A failed job raises a condition**, so failures surface where every other fact does.

## When to use a local check

A local check is fine for state one screen owns. The moment a second reader appears, move it to
the tables.

## Tests

- Every kind has a row (the type system does this when keyed by kind).
- Every edge's read is exercised: a dependant appears in `dependents`; deleting its referent
  makes it an orphan; re-adding heals it.
- Root-cause attribution over a fixture with a known dependency chain.
- Jobs, if present: every kind has a row; a job moves through each state; a failure raises its
  condition.
