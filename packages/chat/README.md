# packages/chat

The chat panel (D-037): a framework-free core and plain web components, styled only through its
own `--chat-*` custom properties, which each host maps to its tokens. It is built to become
nclite's vision board chat mode, so it stands alone.

- **Contract**: `schema/chat-event.schema.json`, the package's own JSON Schema (`$id`
  `https://vision-board.invalid/schema/chat/1/chat-event.schema.json`): every chat event, the
  approval facts and the answers (`docs/specification/api.md` 98-104, `docs/specification/chat.md`).
  The board server's schema registry and `openapi.json` reference it by `$id`. `src/events.ts`
  writes the shapes out as types; `apps/board/tests/chat-fixture.test.ts` checks them against it.
- **Depends on**: nothing in this repo (its D-016 layer is empty).
- **Used by**: `apps/board`: the sidebar (`src/shell/ChatSidebar.svelte`, `src/board/chat-panel.ts`), its bridge to the board (`src/board/chat-bridge.ts`) and the gallery.

## The pieces

The `packages/ui` split, one folder per pattern: a core with no DOM (unit-tested under Node), a
template (one pure function to markup), an element (light DOM, defined lazily), its CSS and a
`pattern.json` saying what it is.

| Pattern | Element | Core |
|---|---|---|
| `feed/` | `<chat-feed>`: the log, the status line, change chips, system lines | `applyEvent`, `ChatState`, `activityLine`, `changeLabel` |
| `message/` | `<chat-message>`: one message, the person's with chips | (template only) |
| `approval/` | `<chat-approval>`: Allow once, Allow for this session, Deny | `approvalView`, `APPROVAL_CHOICES`, `timeLeft` |
| `composer/` | `<chat-composer>`: text, removable chips, the host's context chip and its preview | `composerView`, `sendIntent` |
| `header/` | `<chat-header>`: agent, model, status, Stop, New session | `headerView` |

`src/conditions.ts` is the chat's conditions table (PLAN ruling 11): busy, waiting (for an
approval), blocked, stopped, error, each with what starts and ends it and whether a message can go
or Stop does anything. The header's status, Stop and the composer's Send all read it.

## How a host uses it

```ts
import '<packages/chat>/src/chat.css';           // pulls in each pattern's CSS
import './chat-host.css';                         // the host's --chat-* to its tokens
import { applyEvent, composerView, defineChatElements, EMPTY_CHAT, headerView } from '<packages/chat>/src/index.ts';

defineChatElements();                            // once, before creating any
// <div class="chat-panel"><chat-header></chat-header><chat-feed></chat-feed><chat-composer></chat-composer></div>
feed.configure({ render: myMarkdown, boardName: (id) => titleOf(id) });
let state = EMPTY_CHAT;
stream.onmessage = (e) => {                      // the host's stream of chat events
  state = applyEvent(state, JSON.parse(e.data));
  feed.show(state);
  header.show(headerView({ agent: 'claude', model }, state, host));
  composer.show(composerView(state, host));       // host = { blocked?: 'why no message can go', holds?: true }
};
```

A host may attach more than chips: `composer.setContext({ label, text })` shows one chip, not
removable, summarising what the host sends with every message (the board: "3 answers · 2 selected",
its selected cards and the answers since the last Send, and no other chips). Hovering it, or click,
Enter or Space, opens a preview over the feed, "What the agent receives", of `text` exactly as it goes;
hover keeps it while the pointer is on the chip or the preview, a click holds it until clicked again,
and Esc closes it with focus back on the chip. With `host.holds` the composer's Send also
takes a message with no words when anything is attached, and one while the agent works, which the
host holds and sends when the turn ends; without it, a message needs words, as before.

The elements raise events and never call a server (the names are constants in `src/events.ts`, so a host can listen before it loads the elements, as the board does: it loads them when its panel first opens, `apps/board/src/board/chat-view.ts`): `chat-send` `{ text, chips }`,
`chat-chip-remove` `{ chip }`, `chat-answer` `{ approvalId, answer }`, `chat-change`
`{ board, cards, head? }`, `chat-stop`, `chat-new-session`, `chat-pick` `{ field, id }`. The host
answers them with its own routes (here the board's chat routes, api.md 98-107), clears the composer
once a message went through, calls `feed.follow()` when the person sends (the feed otherwise follows
the latest words until the person scrolls away, and shows a "Jump to latest" button meanwhile), and
calls `feed.answerFailed(id, why)` when an answer did not.

- **Markdown**: the host passes its renderer to `feed.configure({ render })`; it must escape every
  text run. Without one the agent's words show as typed. The person's words are never markup.
- **Styling**: `src/chat.css` lists every `--chat-*` property with a neutral fallback (readable
  light and dark on its own); a host sets them on `:root` or any ancestor. The board's mapping is
  `apps/board/src/styles/chat-host.css`. Elements set no inline styles, so a strict CSP holds.
- **nclite**: its Svelte page mounts the same elements unchanged, maps `--chat-*` to its palette
  tokens, and feeds events from its own engine; its approval drawer's answers become `chat-answer`.
- **Gallery**: `apps/board/src/gallery/chat-section.ts` (flag `chatPanel`), fed by
  `gallery.chat.json`, the recorded Claude turns as chat events.
