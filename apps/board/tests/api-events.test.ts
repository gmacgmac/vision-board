// The project stream (`watch_project`, GET /api/events; api.md 44, 78-80): `retry` first, a
// `change { seq }` on every append, 200 on an empty project; `build { build }` only in watch mode
// (`VB_WATCH=1`), once on connect and again when the built page changes. Every event is held to
// the operation's `itemSchema` (api.md 54).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir } from '#format/testing';
import { startTestBoard } from './test-board.ts';
import { AGENT, startBoard } from './api-harness.ts';
import { checkAnswer, compileInline, doc } from './openapi-ajv.ts';

const ITEM = compileInline(doc.paths['/api/events'].get.responses['200'].content['text/event-stream'].itemSchema);

interface Sse { event: string; data: any }

/** A stream's text as it arrives. `until` reads until `re` matches everything so far, or fails
 * after `ms`; one read is kept pending across calls, so a timeout never drops a chunk. */
function follow(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let pending: Promise<ReadableStreamReadResult<Uint8Array>> | undefined;
  return {
    get text() { return text; },
    /** The events received so far, each checked against the item schema. */
    events(): Sse[] {
      return text.split('\n\n').filter((b) => /^event: /m.test(b)).map((block) => {
        const fields = Object.fromEntries(block.split('\n').filter((l) => !l.startsWith(':')).map((l) => [l.slice(0, l.indexOf(': ')), l.slice(l.indexOf(': ') + 2)]));
        assert.ok(ITEM(fields), `${JSON.stringify(fields)}: ${JSON.stringify(ITEM.errors)}`);
        return { event: fields.event!, data: JSON.parse(fields.data!) };
      });
    },
    async until(re: RegExp, ms = 4000): Promise<void> {
      const deadline = Date.now() + ms;
      while (!re.test(text)) {
        const left = deadline - Date.now();
        if (left <= 0) assert.fail(`no ${re} in ${JSON.stringify(text)}`);
        pending ??= reader.read();
        const chunk = await Promise.race([pending, new Promise<null>((ok) => setTimeout(() => ok(null), left))]);
        if (!chunk) continue;
        pending = undefined;
        if (chunk.done) assert.fail('the stream ended');
        text += decoder.decode(chunk.value, { stream: true });
      }
    },
  };
}

async function open(base: string, stop: AbortController) {
  const res = await fetch(`${base}/api/events`, { signal: stop.signal });
  checkAnswer('watch_project', { status: res.status, headers: res.headers, media: 'text/event-stream', body: undefined });
  return follow(res);
}

test('watch_project: 200 on an empty project, retry first, a change on each append, never a build', async () => {
  const dir = makeTempDir('vb-events-');
  const board = await startTestBoard({ project: dir, dist: dir });
  const { ledger } = board;
  const stop = new AbortController();
  try {
    const s = await open(board.base, stop);
    await s.until(/retry: 2000\n\n/);
    assert.match(s.text, /^retry: 2000\n\n/);
    fs.mkdirSync(path.dirname(ledger.file), { recursive: true });
    const first = ledger.append({ type: 'board', board: 'first', title: 'First board' }, AGENT);
    await s.until(/event: change/);
    assert.deepEqual(s.events(), [{ event: 'change', data: { seq: first.seq } }]);
    assert.doesNotMatch(s.text, /event: build/);
  } finally {
    stop.abort();
    await board.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('watch_project in watch mode: build on every connect, a new id when index.html changes', async () => {
  const h = await startBoard({ watch: true });
  const stops = [new AbortController(), new AbortController()];
  try {
    const a = await open(h.base, stops[0]!);
    await a.until(/event: build/);
    assert.match(a.text, /^retry: 2000\n\nevent: build\n/);
    const id = a.events()[0]!.data.build;
    const b = await open(h.base, stops[1]!);
    await b.until(/event: build/);
    assert.deepEqual(b.events(), [{ event: 'build', data: { build: id } }]);
    const e = h.ledger.append({ type: 'reply', n: h.seeded.qId, text: 'Still streaming.' }, AGENT);
    await a.until(/event: change/);
    const index = path.join(h.dist, 'index.html');
    fs.writeFileSync(index, '<!doctype html><title>Board, rebuilt</title>\n');
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(index, later, later);
    await a.until(/event: build[^]*event: build/);
    const events = a.events();
    assert.deepEqual(events.slice(0, 2), [{ event: 'build', data: { build: id } }, { event: 'change', data: { seq: e.seq } }]);
    assert.equal(events[2]!.event, 'build');
    assert.notEqual(events[2]!.data.build, id);
  } finally {
    for (const s of stops) s.abort();
    await h.close();
  }
});
