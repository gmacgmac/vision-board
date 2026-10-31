// The fake host's chat, from docs/specification/plugin.md § The chat: it holds chips by key, spends what went, sends
// through its own server (which resolves each chip, as a host must), and keeps the lines a tool's change made. It
// uses only the seam: `attach`, `send(record)`, `status`, `reveal`, `hasLine`.
export function createChat(flags) {
  const chips = new Map();
  const spent = new Map();
  const heard = new Set();
  const lines = [];
  const statusHeard = new Set();
  const log = { attaches: [], sends: 0, reveals: [], problems: [] };
  const say = () => { for (const l of heard) l(); };
  const refOf = (chip) => JSON.stringify(chip.ref);
  const status = {
    now: 'idle',
    on(listener) { statusHeard.add(listener); return () => statusHeard.delete(listener); },
  };
  const chat = {
    attach(key, chip) {
      log.attaches.push({ key, chip });
      if (!chip || spent.get(key) === refOf(chip)) chips.delete(key);
      else { chips.set(key, chip); spent.delete(key); }
      say();
    },
    async send(record) {
      log.sends += 1;
      const going = [...chips.entries()];
      const r = await fetch('/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chips: going.map(([, chip]) => chip) }) });
      if (!r.ok) {
        const { reason } = await r.json();
        log.problems.push(reason);
        return reason;
      }
      for (const [key, chip] of going) { spent.set(key, refOf(chip)); chips.delete(key); }
      say();
      return record();
    },
    status,
    reveal(ref) { log.reveals.push(ref); },
    hasLine: ({ board, n }) => lines.some((l) => l.board === board && l.cards.includes(n)),
  };
  const given = flags.noChat
    ? { attach() {}, send: (record) => record(), status: { now: 'idle', staged: false, on: (listener) => { statusHeard.add(listener); return () => statusHeard.delete(listener); } } }
    : flags.noReveal ? { attach: chat.attach, send: chat.send, status } : chat;
  return {
    chat: given,
    log,
    lines: () => [...lines],
    chips: () => [...chips.values()],
    hear: (listener) => { heard.add(listener); listener(); },
    addLine(line) { lines.push(line); say(); },
    setStatus(patch) { Object.assign(status, patch); for (const l of statusHeard) l(); },
    statusListeners: () => statusHeard.size,
  };
}
