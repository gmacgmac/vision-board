// svg as a picture (D-064, host-fixes-and-svg SVG_01): the one table holds it, the path check allows
// it only with the svgImages flag on (off, the words of the time before svg), and `svgProblem` knows an
// svg by its opening, since it has no first bytes of its own: a root `<svg>` in the SVG namespace that
// says its size, after an optional BOM, XML declaration, comments and doctype; never one whose doctype
// declares entities. Its script is not looked for (the browser runs none of it in an <img>).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAGS, IMAGE_HEAD_BYTES, IMAGE_LIMITS, IMAGE_WORDS, flagOn, imageCap, imageHeadProblem, imageNotReal, imagePathProblem,
  imageTypeByName, imageTypeOf, parseFlags, svgProblem,
} from '../src/index.ts';

const W = IMAGE_WORDS;
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);
const svg = (s: string) => svgProblem(bytes(s));

test('svgImages is on by default, and -svgImages turns it off', () => {
  assert.equal(flagOn('svgImages'), true);
  assert.equal(flagOn('svgImages', parseFlags('-svgImages').overrides), false);
  assert.match(FLAGS.svgImages.description, /only png, jpeg, webp or gif/);
});

test('the one table: svg is a type, its extension svg, its content type image/svg+xml, with its own cap and head', () => {
  assert.deepEqual(IMAGE_LIMITS.types.svg, { extensions: ['svg'], contentType: 'image/svg+xml', magic: [] });
  assert.equal(imageTypeByName('d/logo.svg'), 'svg');
  assert.equal(imageTypeByName('logo.SVG'), 'svg');
  assert.equal(imageTypeByName('logo.svgz'), undefined);
  assert.ok(IMAGE_HEAD_BYTES >= IMAGE_LIMITS.svgHeadBytes, 'the route reads enough of an svg to check its opening');
  assert.ok(IMAGE_LIMITS.svgMaxBytes < IMAGE_LIMITS.maxBytes);
  assert.deepEqual(imageCap('svg'), { bytes: IMAGE_LIMITS.svgMaxBytes, words: W.svgTooBig });
  assert.deepEqual(imageCap('png'), { bytes: IMAGE_LIMITS.maxBytes, words: W.tooBig });
  assert.equal(W.svgTooBig, `over ${IMAGE_LIMITS.svgMaxBytes / (1024 * 1024)} MB`);
});

test('imagePathProblem: svg passes with the flag on (the default); off, it and every other type get the words before svg', () => {
  for (const p of ['logo.svg', 'd/e/flow.SVG']) {
    assert.equal(imagePathProblem(p), undefined, p);
    assert.equal(imagePathProblem(p, { svg: true }), undefined, p);
    assert.equal(imagePathProblem(p, { svg: false }), W.typeNoSvg, p);
  }
  for (const p of ['a.html', 'a.svgz', 'a', 'a.png.svg.js']) {
    assert.equal(imagePathProblem(p), W.type, p);
    assert.equal(imagePathProblem(p, { svg: false }), W.typeNoSvg, p);
  }
  assert.equal(imagePathProblem('a.png', { svg: false }), undefined, 'the other types are untouched');
  assert.equal(imagePathProblem('../a.svg', { svg: false }), W.outside, 'a path rule still comes first');
  assert.equal(W.type, 'only png, jpeg, webp, gif or svg');
  assert.equal(W.typeNoSvg, 'only png, jpeg, webp or gif');
});

test('svgProblem: a plain svg, with an XML declaration, a BOM, comments, a doctype with no entities, sized by viewBox or by width and height', () => {
  for (const s of [
    `<svg ${NS} viewBox="0 0 200 100"><rect width="10" height="10"/></svg>`,
    `<svg ${NS} width="64" height="32"/>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- made by hand -->\n<svg ${NS} viewBox="0,0,20,10">`,
    `﻿<svg\n  ${NS}\n  width='12.5px' height='4em'>`,
    `<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg ${NS} viewBox="0 0 1 1">`,
    `<svg viewBox="-5 -5 10 10" xmlns:xlink="http://www.w3.org/1999/xlink" ${NS} data-x="a > b"><script>never runs</script></svg>`,
  ]) assert.equal(svg(s), undefined, s);
});

test('svgProblem: HTML named .svg, an empty file, text, another namespace or none, and an opening past the head are not a real svg', () => {
  const notReal = imageNotReal('svg');
  for (const s of [
    '', '<!doctype html><svg><script>alert(1)</script></svg>', '<html><body></body></html>', 'just some text',
    '<svg viewBox="0 0 1 1"></svg>', '<svg xmlns="http://www.w3.org/1999/xhtml" viewBox="0 0 1 1">', '<svgx xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">',
    `text first <svg ${NS} viewBox="0 0 1 1">`, `<svg ${NS} viewBox="0 0 1 1"`, `<!-- not closed <svg ${NS} viewBox="0 0 1 1">`,
    `<!--${' '.repeat(IMAGE_LIMITS.svgHeadBytes)}--><svg ${NS} viewBox="0 0 1 1">`,
  ]) assert.equal(svg(s), notReal, JSON.stringify(s.slice(0, 60)));
});

test('svgProblem: an svg that says no size, or a size the browser would not use, is refused with words saying why', () => {
  for (const s of [
    `<svg ${NS}>`, `<svg ${NS} width="100">`, `<svg ${NS} width="100%" height="100%">`, `<svg ${NS} width="0" height="10">`,
    `<svg ${NS} viewBox="0 0 0 10">`, `<svg ${NS} viewBox="0 0 10">`, `<svg ${NS} viewBox="a b c d">`, `<svg ${NS} viewBox="0 0 -1 1">`,
  ]) assert.equal(svg(s), W.svgSize, s);
});

test('svgProblem: a doctype that declares entities is refused, before the root or with no root at all', () => {
  const bomb = '<!DOCTYPE svg [ <!ENTITY a "aaaaaaaaaa"> <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"> ]>';
  for (const s of [`${bomb}<svg ${NS} viewBox="0 0 1 1">&b;</svg>`, bomb, `<!DOCTYPE svg [<!entity % p SYSTEM "x">]><svg ${NS} width="1" height="1">`]) {
    assert.equal(svg(s), W.svgEntity, s);
  }
});

test('svgProblem: an entity is refused wherever it sits in the head, so text holding <svg before it hides nothing (VERIFY_01 F1)', () => {
  const ent = '<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">';
  for (const s of [
    `<!-- <svg --><!DOCTYPE svg [${ent}]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`,
    `<?x <svg ?><!DOCTYPE svg [${ent}]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`,
    `<!DOCTYPE svg [<!-- <svg -->${ent}]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`,
  ]) assert.equal(svg(s), W.svgEntity, s);
  assert.equal(svg(`<!-- <svg> drawn by hand --><?x <svg ?><!DOCTYPE svg><svg ${NS} viewBox="0 0 1 1"><rect width="1" height="1"/></svg>`), undefined,
    'text holding <svg before an ordinary svg still passes');
});

test('svgProblem: a long run of white space or comments, or an endless opening tag, is answered quickly', () => {
  const started = performance.now();
  for (const s of [' '.repeat(IMAGE_HEAD_BYTES), '<!--'.repeat(IMAGE_HEAD_BYTES / 4), `<svg ${NS} ${'a="b" '.repeat(1000)}`, '<?'.repeat(IMAGE_HEAD_BYTES / 2)]) {
    assert.equal(svg(s), imageNotReal('svg'));
  }
  assert.ok(performance.now() - started < 200, 'linear, not exponential');
});

test('imageHeadProblem: svg by its opening, every other type by its first bytes', () => {
  assert.equal(imageHeadProblem('svg', bytes(`<svg ${NS} width="1" height="1"/>`)), undefined);
  assert.equal(imageHeadProblem('svg', bytes(`<svg ${NS}/>`)), W.svgSize);
  assert.equal(imageHeadProblem('png', bytes(`<svg ${NS} width="1" height="1"/>`)), imageNotReal('png'));
  assert.equal(imageTypeOf(bytes(`<svg ${NS} width="1" height="1"/>`)), undefined, 'svg has no first bytes: imageTypeOf never names it');
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(imageHeadProblem('png', png), undefined);
  assert.equal(imageHeadProblem('svg', png), imageNotReal('svg'));
});
