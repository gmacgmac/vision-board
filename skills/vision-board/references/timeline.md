# Timelines

For events with dates: a plan, a roadmap, a history, a schedule. The `timeline` key puts a card on
its container's line, which the board draws across the top of the container. A date in a card's
text is only text: a date mentioned in passing (a finding's deadline) gets no key.

## The date

Write it at the precision you know, in one of four forms:

| You know | Write |
|---|---|
| A year | `2027` |
| A month | `2027-03` |
| A day | `2027-04-14` |
| A day and a time | `2027-05-20T15:30` |

- Never invent a day for a month, or a month for a year: "in March" is `2027-03`.
- A quarter or a week has no form: give its first month or day (the week of 7 June is
  `2027-06-07`) and name the quarter or the week in the body.
- A time as the person said it, with no zone. A year the person gives once holds for the dates
  after it.
- A refused date comes back with the four forms: resend it in one of them.

## The cards

- The date is the card's header, so the title never repeats it: "Beta opens", not "March: beta
  opens"; the body doesn't start with it either.
- The board orders, spaces and alternates the dated cards: write them in any order.
- Several events in one card (a week, a day of sessions): each as a `###` heading or a line that
  opens with a bold name (`**Wednesday**: public launch`), and each draws as an entry. Never `##`
  or plain bullets for them.
- Kinds still hold: a decision on the line is still a `decision`, and says what ✓ and ✗ mean.

## The container

- The dated cards of one timeline go in one container; a second timeline is a second container.
- There is no `timeline` mode: the container keeps its layout. Its undated cards draw below the
  line (beside it when it runs down).
- A rewrite of a dated card (a `node` item with `n` and `base`) carries `timeline` again, or the
  card leaves the line; an `append` keeps it.
- `show_layout` lists the line in order.

A worked call, three dated cards, one holding a week's events, as `write_board`'s arguments:
```json
{"board": "redesign", "items": [
  {"type": "region", "key": "redesign-region-plan", "region": {"id": "plan", "title": "Plan"}},
  {"type": "node", "key": "redesign-card-interviews", "node": {"region": "plan", "kind": "topic", "title": "Customer interviews", "timeline": "2027-01", "body": "Twelve customers, three markets."}},
  {"type": "node", "key": "redesign-card-sprint", "node": {"region": "plan", "kind": "topic", "title": "Design sprint", "timeline": "2027-02-08", "body": "### Monday\nMap the problem.\n\n### Wednesday\nSketch and decide.\n\n### Friday\nTest the prototype."}},
  {"type": "node", "key": "redesign-card-signoff", "node": {"region": "plan", "kind": "decision", "title": "Sign off the design", "timeline": "2027-02-19T10:00", "body": "✓ build it · ✗ another sprint"}}
]}
```
