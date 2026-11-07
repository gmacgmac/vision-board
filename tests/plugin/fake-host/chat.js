// The fake host's chat, from docs/specification/plugin.md § The chat: it holds chips by key, spends what went, sends
// through its own server (which resolves each chip, as a host must), then records the Send with the acks the engine's
// answers carried (`[]` with none), and keeps the change lines a tool's result named. A chip the person removes
// (`drop`) is left out of that message only. It uses only the seam: `attach`, `send(record)`, `status`, `reveal`, `hasLine`.
export function createChat(flags) {
  const chips = new Map();
  const spent = new Map();
  /** Keys the person removed from the next message (its chip's ✕): that message goes without them. */
  const dropped = new Set();
  const heard = new Set();
  const lines = [];
  const statusHeard = new Set();
  const log = { attaches: [], sends: 0, reveals: [], problems: [] };
  const say = () => { for (const l of heard) l(); };
  const refOf = (chip) => JSON.stringify(chip.ref);
  const status = {
    now: 'idle',
    on(listener) { statusHeard.add(listener); return flags.plainOn ? undefined : () => statusHeard.delete(listener); },
  };
  const chat = {
    attach(key, chip) {
      log.attaches.push({ key, chip });
      if (!chip || spent.get(key) === refOf(chip)) chips.delete(key);
      else { chips.set(key, chip); spent.delete(key); }
      say();
    },
    async send(record) {
      if (flags.sendFails) throw new Error('A fetch that failed');
      log.sends += 1;
      const going = [...chips.entries()].filter(([key]) => !dropped.has(key));
      const r = await fetch('/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chips: going.map(([, chip]) => chip) }) });
      if (!r.ok) {
        const { reason } = await r.json();
        log.problems.push(reason);
        return reason;
      }
      const { acks } = await r.json();
      for (const [key, chip] of going) { spent.set(key, refOf(chip)); chips.delete(key); }
      dropped.clear();
      say();
      return record(flags.acks ?? acks); // `acks`: a host that hands back other acks than its engine's (a test's)
    },
    status,
    reveal(ref) { log.reveals.push(ref); },
    // A line matches a plain ref `{ board, cards: n }` when its reveal has that board and a cards list holding n.
    hasLine: ({ board, cards }) => lines.some((l) => l.reveal?.board === board && Array.isArray(l.reveal.cards) && l.reveal.cards.includes(cards)),
  };
  const given = flags.noChat
    ? { attach() {}, send: (record) => record(null), status: { now: 'idle', staged: false, on: (listener) => { statusHeard.add(listener); return () => statusHeard.delete(listener); } } }
    : flags.noReveal ? { attach: chat.attach, send: chat.send, status } : chat;
  return {
    chat: given,
    log,
    lines: () => [...lines],
    chips: () => [...chips].filter(([key]) => !dropped.has(key)).map(([, chip]) => chip),
    drop(key) { dropped.add(key); say(); },
    hear: (listener) => { heard.add(listener); listener(); },
    addLine(line) { lines.push(line); say(); },
    setStatus(patch) { Object.assign(status, patch); for (const l of statusHeard) l(); },
    statusListeners: () => statusHeard.size,
  };
}
