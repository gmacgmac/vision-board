// The composer's files (D-068, COMPOSE_01), the parts with no DOM: Send follows where the files stand, what
// a screen reader is told, what a paste attaches, the chip of each state, and a sent message's file chips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ComposerFile, ComposerFileWords } from '../src/index.ts';
import {
  applyEvents, attachTemplate, chipsTemplate, composerView, dropTemplate, EMPTY_CHAT, filesSaid, fileChipTemplate, fileTemplate,
  messageTemplate, newestFile, pastedFiles, sendIntent,
} from '../src/index.ts';

const WORDS: ComposerFileWords = {
  attach: 'Attach files', tip: 'The tip', drop: 'Drop here', uploading: 'Uploading…', ready: 'ready', waits: 'Send waits.',
  remove: (n) => `Remove ${n}`, removed: (n) => `${n} removed.`, said: (f) => `${f.name} is ${f.state}.`, batch: (c) => `${c.uploading} up, ${c.ready} ready, ${c.refused} no.`,
};
const file = (state: ComposerFile['state'], name = 'a.pdf', id = 'f1'): ComposerFile => ({ id, name, state, ...(state === 'refused' && { reason: 'Too big <b>.' }) });

test('Send: a ready file goes with no words; while one uploads nothing goes, words included; a refused one is no reason to go', () => {
  const on = { send: true };
  assert.equal(sendIntent('', on, true, [file('ready')]), 'send');
  assert.equal(sendIntent('Go', on, false, [file('uploading')]), 'skip');
  assert.equal(sendIntent('', { attach: true, send: false }, true, [file('uploading'), file('ready')]), 'skip');
  assert.equal(sendIntent('', on, false, [file('refused')]), 'skip');
  assert.equal(sendIntent('Go', on, false, [file('refused')]), 'send');
  assert.equal(sendIntent('', { ...on, shut: 'No.' }, true, [file('ready')]), 'skip');
  assert.equal(sendIntent('', { send: false }, true, [file('ready')]), 'skip', 'without a host that holds, not while the agent works');
  assert.equal(sendIntent('', { send: false, attach: true }, true, [file('ready')]), 'send', 'a host that holds takes it while the agent works');
});

test('the view is today\'s until the host hands it its words', () => {
  assert.ok(!('files' in composerView(EMPTY_CHAT)));
});

test('what is announced: each new file, and each whose state moved; nothing when none did', () => {
  assert.equal(filesSaid([], [file('uploading')], WORDS), 'a.pdf is uploading.');
  assert.equal(filesSaid([file('uploading')], [file('ready')], WORDS), 'a.pdf is ready.');
  assert.equal(filesSaid([file('ready')], [file('ready')], WORDS), '');
  assert.equal(filesSaid([file('ready')], [], WORDS), '');
  assert.equal(filesSaid([file('ready')], [file('ready'), file('refused', 'b.png', 'f2')], WORDS), 'b.png is refused.');
});

test('the file brought into view: the last that came, or one just refused; none when only an upload finished', () => {
  const [a, b] = [file('uploading', 'a', 'a'), file('uploading', 'b', 'b')];
  assert.equal(newestFile([], [a, b]), b);
  assert.equal(newestFile([a, b], [{ ...a, state: 'ready' }, b]), undefined);
  assert.equal(newestFile([a, b], [{ ...a, state: 'refused' }, b])?.id, 'a');
  assert.equal(newestFile([{ ...a, state: 'refused' }], [{ ...a, state: 'refused' }]), undefined);
});

test('a paste attaches only when there is no other text, or the text is just the files\' names', () => {
  const pic = { name: 'image.png' };
  assert.deepEqual(pastedFiles([pic], ''), [pic], 'a screenshot');
  assert.deepEqual(pastedFiles([pic], 'Q3\tQ4\n12\t14'), [], 'a spreadsheet\'s cells, with a picture of them: the text');
  assert.deepEqual(pastedFiles([{ name: 'a.pdf' }], 'a.pdf'), [{ name: 'a.pdf' }], 'a file copied in the file manager');
  assert.deepEqual(pastedFiles([{ name: 'a.pdf' }, { name: 'b.pdf' }], 'a.pdf\r\nb.pdf\r\n'), [{ name: 'a.pdf' }, { name: 'b.pdf' }]);
  assert.deepEqual(pastedFiles([], 'words'), []);
  assert.deepEqual(pastedFiles([], ''), []);
});

test('each chip says its state in words as well as its mark, and a refused one why, in full and escaped', () => {
  const up = fileTemplate(file('uploading'), WORDS);
  assert.match(up, /data-state="uploading"/);
  assert.match(up, /data-glyph="uploading"/);
  assert.match(up, /<span class="chat-chip-s">Uploading…<\/span>/);
  const ready = fileTemplate(file('ready'), WORDS);
  assert.match(ready, /data-glyph="document"/);
  assert.match(ready, /<span class="chat-sr">ready<\/span>/);
  assert.match(fileTemplate(file('ready', 'shot.PNG'), WORDS), /data-glyph="picture"/);
  const refused = fileTemplate(file('refused'), WORDS);
  assert.match(refused, /data-glyph="refused"/);
  assert.match(refused, /<span class="chat-chip-why">Too big &lt;b&gt;\.<\/span>/);
  for (const html of [up, ready, refused]) assert.match(html, /<button type="button" class="chat-chip-x" data-file="f1" aria-label="Remove a\.pdf">/);
});

test('a hostile name is text, and shows in its own direction', () => {
  const html = fileTemplate(file('ready', '"><img src=x onerror=y>.png'), WORDS);
  assert.ok(!html.includes('<img'));
  assert.match(html, /class="chat-chip-t" dir="auto"/);
});

test('the chips row holds files only with the host\'s words, between the chips and the context', () => {
  assert.equal(chipsTemplate([], null, false, 'x', [file('ready')]), '', 'no words, no chip');
  const row = chipsTemplate([{ kind: 'card', ref: 3, label: 'Plan' }], { label: '1 selected', text: '' }, false, 'x', [file('ready')], WORDS);
  const [card, chip, context] = ['data-chip="card-3"', 'data-file="f1"', 'chat-cmp-ctx'].map((m) => row.indexOf(m));
  assert.ok(card! >= 0 && card! < chip! && chip! < context!);
});

test('the paperclip has a name and a tip, its input takes many; the drop hint is the host\'s', () => {
  const html = attachTemplate(WORDS);
  assert.match(html, /<button type="button" class="chat-cmp-attach" aria-label="Attach files" title="The tip">/);
  assert.match(html, /<input type="file" class="chat-cmp-input" multiple hidden>/);
  assert.equal(dropTemplate(WORDS), '<p class="chat-cmp-drop">Drop here</p>');
});

test('a sent message shows a chip per file: the person\'s name when given, the saved one else; a mark, never a link', () => {
  const stamp = { at: '2026-10-30T10:00:00Z', session: 's', seq: 1 };
  const files = [{ name: 'file.png', path: 'p/1-file.png', size: 3, label: '写真.png' }, { name: 'notes.txt', path: 'p/2-notes.txt', size: 3 }];
  const state = applyEvents(EMPTY_CHAT, [{ ...stamp, kind: 'message_in', text: 'Attached files.', files }]);
  const entry = state.entries[0]!;
  assert.ok(entry.type === 'person');
  assert.deepEqual(entry.files, files);
  const html = messageTemplate(entry, (x) => x);
  assert.match(html, /aria-label="Sent with it"/);
  assert.match(html, /data-glyph="picture"[^]*写真\.png/);
  assert.match(html, /data-glyph="document"[^]*notes\.txt/);
  assert.ok(!html.includes('file.png') && !html.includes('<a ') && !html.includes('p/1-file.png'));
  assert.ok(!('files' in applyEvents(EMPTY_CHAT, [{ ...stamp, kind: 'message_in', text: 'Plain' }]).entries[0]!), 'none: left out');
  assert.equal(fileChipTemplate({ name: 'a.txt' }).includes('title="a.txt"'), true);
});

test('F9: more than three files moving at once are one line of counts, a shared chip counting for all it stands for', () => {
  const many = Array.from({ length: 10 }, (_, i) => file('uploading', `${i}.txt`, `f${i}`));
  const shared: ComposerFile = { id: 'over', name: '990 more files', state: 'refused', reason: 'too many', count: 990 };
  assert.equal(filesSaid([], [...many, shared], WORDS), '10 up, 0 ready, 990 no.');
  assert.equal(filesSaid(many, many.map((f) => ({ ...f, state: 'ready' as const })), WORDS), '0 up, 10 ready, 0 no.');
  assert.equal(filesSaid([], many.slice(0, 3), WORDS), '0.txt is uploading. 1.txt is uploading. 2.txt is uploading.', 'three are still said by name');
  assert.equal(filesSaid([], [shared], WORDS), '990 more files is refused.', 'alone, by its name');
});
