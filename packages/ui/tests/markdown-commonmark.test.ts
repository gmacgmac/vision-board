// CommonMark's own examples for every construct the renderer supports (D-023). Each example in
// the covered sections is rendered and compared with the spec's HTML, after mapping our output
// back to plain CommonMark tags (classes, the label, the quote and the image shapes) and applying our
// link and image rules to the spec's side, so the comparison is fair. Examples we deliberately differ on are in
// EXCLUDED, each with a reason; any other failure fails the test, and so does an excluded example
// that passes, so the table is the exact list of differences.
// Fixture: tests/fixtures/commonmark-0.31.2.json (CC BY-SA 4.0, see tests/fixtures/README.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { imagePathProblem } from '../../format/src/index.ts';
import { imageNote, renderMarkdown } from '../src/index.ts';

interface Example { markdown: string; html: string; example: number; section: string }

/** Why an example differs. One reason per construct D-023 leaves out. */
const TABS = 'tabs are expanded to spaces (four-column stops) before parsing';
const INDENTED = 'indented code is not in the subset: its lines are paragraph text';
const RAW_HTML = 'raw HTML is always escaped (D-023)';
const HTML_BLOCK = 'HTML blocks are not in the subset: escaped paragraph text';
const REFS = 'reference links and definitions are not in the subset: plain text';
const HR = 'thematic breaks are not in the subset: paragraph text';
const SETEXT = 'setext headings are not in the subset: paragraph text';
const DEEP = 'lists nested deeper than one level are plain text';

/** Every example we deliberately differ on: number, then why (one line). */
const EXCLUDED: Record<number, string> = {
  13: TABS,
  18: INDENTED, 69: INDENTED, 134: INDENTED, 225: INDENTED, 231: INDENTED, 236: INDENTED, 252: INDENTED,
  253: INDENTED, 254: INDENTED, 257: INDENTED, 264: INDENTED, 270: INDENTED, 271: INDENTED, 272: INDENTED,
  273: INDENTED, 274: INDENTED, 278: INDENTED, 286: INDENTED, 287: INDENTED, 288: INDENTED, 289: INDENTED,
  290: INDENTED, 313: INDENTED,
  344: RAW_HTML, 475: RAW_HTML, 476: RAW_HTML, 477: RAW_HTML, 491: RAW_HTML, 494: RAW_HTML, 524: RAW_HTML,
  536: RAW_HTML, 613: RAW_HTML, 614: RAW_HTML, 615: RAW_HTML, 616: RAW_HTML, 617: RAW_HTML, 623: RAW_HTML,
  625: RAW_HTML, 626: RAW_HTML, 627: RAW_HTML, 628: RAW_HTML, 629: RAW_HTML, 630: RAW_HTML, 631: RAW_HTML,
  642: RAW_HTML, 643: RAW_HTML,
  21: HTML_BLOCK, 308: HTML_BLOCK, 309: HTML_BLOCK,
  23: REFS, 317: REFS, 527: REFS, 528: REFS, 529: REFS, 530: REFS, 531: REFS,
  532: REFS, 533: REFS, 534: REFS, 535: REFS, 537: REFS, 538: REFS, 539: REFS,
  540: REFS, 541: REFS, 542: REFS, 543: REFS, 544: REFS, 545: REFS, 549: REFS,
  550: REFS, 553: REFS, 554: REFS, 555: REFS, 556: REFS, 557: REFS, 558: REFS,
  559: REFS, 560: REFS, 561: REFS, 562: REFS, 563: REFS, 564: REFS, 565: REFS,
  566: REFS, 567: REFS, 568: REFS, 569: REFS, 570: REFS, 571: REFS,
  573: REFS, 576: REFS, 577: REFS, 582: REFS, 583: REFS, 584: REFS, 585: REFS, 586: REFS, 587: REFS,
  588: REFS, 589: REFS, 591: REFS, 592: REFS, 593: REFS,
  77: HR, 234: HR, 246: HR,
  141: SETEXT, 300: SETEXT,
  294: DEEP, 299: DEEP, 307: DEEP,
};

const SPEC = JSON.parse(readFileSync(new URL('./fixtures/commonmark-0.31.2.json', import.meta.url), 'utf8')) as Example[];

/** The spec sections the D-023 subset covers. */
const SECTIONS = [
  'Paragraphs', 'Emphasis and strong emphasis', 'Code spans', 'Links', 'Autolinks', 'List items',
  'Lists', 'Block quotes', 'Fenced code blocks', 'Backslash escapes', 'Hard line breaks',
  'ATX headings', 'Raw HTML', 'Images',
];

/** Our shapes back to plain CommonMark tags. */
const ours = (html: string): string => html
  .replace(/<p class="vb-md-p">/g, '<p>')
  .replace(/<span class="vb-md-label" role="heading" aria-level="\d">([\s\S]*?)<\/span>/g, '<h>$1</h>')
  .replace(/<(ul|ol) class="vb-md-list"/g, '<$1')
  .replace(/<blockquote class="vb-md-quote">/g, '<blockquote>')
  .replace(/<pre class="vb-md-code" tabindex="0">/g, '<pre>')
  .replace(/<code class="vb-md-icode">/g, '<code>')
  .replace(/<a class="vb-md-link" href="([^"]*)"( title="[^"]*")? rel="noopener noreferrer" target="_blank">/g, '<a href="$1"$2>')
  .replace(/<img class="vb-md-img" src="\/board-images\/([^"]*)" alt="([^"]*)" loading="lazy" decoding="async">/g, '<img src="$1" alt="$2" />');

const ALLOWED = /^(?:https?|mailto):/i;

/** An image as our rule draws it (D-048): a path the one check refuses is the box saying why, one with
 * no alt text its path, else the image without its title. */
function image(m: string, src: string, alt: string): string {
  const path = src.replace(/&amp;/g, '&');
  const why = imagePathProblem(path);
  if (why) return imageNote(path, why);
  return alt.trim() ? `<img src="${src}" alt="${alt}" />` : path;
}

/** The spec's side: heading levels are one label, info strings are dropped, a link our rule refuses is
 * its text, and an image is as our rule draws it. */
const theirs = (html: string): string => html
  .replace(/<img src="([^"]*)" alt="([^"]*)"(?: title="[^"]*")? \/>/g, image)
  .replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, '<h>$2</h>')
  .replace(/<code class="language-[^"]*">/g, '<code>')
  .replace(/<a href="([^"]*)"(?: title="[^"]*")?>([\s\S]*?)<\/a>/g, (m, href: string, text: string) =>
    (ALLOWED.test(href.replace(/&amp;/g, '&')) ? m : text));

const BLOCK_TAG = /\n*(<\/?(?:p|ul|ol|li|blockquote|h|pre)\b[^>]*>)\n*/g;

/** Both sides: one spelling per escaped character, no newlines around block tags, one hard break. */
const common = (html: string): string => html
  .replace(/&#38;/g, '&amp;').replace(/&#60;/g, '&lt;').replace(/&#62;/g, '&gt;')
  .replace(/&#34;/g, '&quot;').replace(/&#39;/g, "'")
  .replace(BLOCK_TAG, '$1')
  .replace(/<br \/>\n?/g, '<br>')
  .trim();

const covered = SPEC.filter((e) => SECTIONS.includes(e.section));
const differs = (e: Example): boolean => common(ours(renderMarkdown(e.markdown))) !== common(theirs(e.html));

test('the fixture is CommonMark 0.31.2 and every covered section has examples', () => {
  assert.equal(SPEC.length, 652);
  for (const s of SECTIONS) assert.ok(covered.some((e) => e.section === s), s);
});

for (const section of SECTIONS) {
  test(`CommonMark: ${section}`, () => {
    const examples = covered.filter((e) => e.section === section);
    const failed = examples.filter((e) => !(e.example in EXCLUDED) && differs(e));
    const report = failed.map((e) => `#${e.example}\n  in:   ${JSON.stringify(e.markdown)}\n  want: ${JSON.stringify(common(theirs(e.html)))}`
      + `\n  got:  ${JSON.stringify(common(ours(renderMarkdown(e.markdown))))}`);
    assert.deepEqual(failed.map((e) => e.example), [], report.join('\n'));
  });
}

test('every EXCLUDED example is in a covered section, has a reason, and really differs', () => {
  for (const [n, reason] of Object.entries(EXCLUDED)) {
    const e = covered.find((x) => x.example === Number(n));
    assert.ok(e, `#${n} is not in a covered section`);
    assert.ok(reason.length > 10, `#${n} needs a reason`);
    assert.ok(differs(e), `#${n} now passes: remove it from EXCLUDED`);
  }
});
