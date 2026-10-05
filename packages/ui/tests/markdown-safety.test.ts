// Safety of the Markdown renderer (D-023, 2c_FE_01): raw HTML is always escaped, only http:,
// https: and mailto: links survive, attributes cannot be broken out of, input is capped at 20,000
// characters, and adversarial input renders safe (its time: markdown.timing.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index.ts';
import { ADVERSARIAL, assertSafe, LINK } from './markdown-adversarial.ts';

test('raw HTML is escaped, inline and as a block', () => {
  for (const src of ['<script>alert(1)</script>', 'a <script>alert(1)</script> b', '<img src=x onerror=alert(1)>',
    'x <img src=x onerror="alert(1)"> y', '<div onclick="x()">\n\n**hi**\n\n</div>', '<!-- c --> <?php ?> <![CDATA[x]]>']) {
    const html = renderMarkdown(src);
    assertSafe(html);
    assert.ok(html.includes('&#60;'), `escaped < in ${html}`);
  }
});

test('every text run escapes & < > " \'', () => {
  assert.equal(renderMarkdown(`a "b" 'c' & <d>`), '<p class="vb-md-p">a &#34;b&#34; &#39;c&#39; &#38; &#60;d&#62;</p>');
  assert.equal(renderMarkdown('`<b>&"\'`'), '<p class="vb-md-p"><code class="vb-md-icode">&#60;b&#62;&#38;&#34;&#39;</code></p>');
  assert.equal(renderMarkdown('```\n<b>&"\'\n```'), '<pre class="vb-md-code" tabindex="0"><code>&#60;b&#62;&#38;&#34;&#39;\n</code></pre>');
});

test('attribute breakout in link text, URL and title is impossible', () => {
  for (const src of ['[a" onmouseover="alert(1)](https://e.com)', '[x](https://e.com/"onmouseover="alert(1))',
    '[x](https://e.com/\'onmouseover=\'alert(1))', '[x](https://e.com "t\\" onmouseover=\\"alert(1)")',
    '[x](<https://e.com/"><script>alert(1)</script>>)', '<https://e.com/"onmouseover="alert(1)>', '[x](https://e.com/><img src=x>)']) {
    const html = renderMarkdown(src);
    assertSafe(html);
    assert.doesNotMatch(html, /"\s*on\w+=/, html);
  }
});

test('only http:, https: and mailto: links survive; anything else is its text', () => {
  const refused = ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'JaVaScRiPt:alert(1)', '<javascript:alert(1)>',
    'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:x', 'file:///etc/passwd', '//evil.com', '/relative', 'evil.com',
    '&#106;avascript:alert(1)', '&#x6A;avascript:alert(1)', 'java%73cript:alert(1)', '\\javascript:alert(1)', ''];
  for (const url of refused) {
    const html = renderMarkdown(`[click](${url})`);
    assertSafe(html);
    assert.doesNotMatch(html, /<a /, `${url}: ${html}`);
    assert.ok(html.includes('click'), `${url}: the text stays`);
  }
  for (const auto of ['<javascript:alert(1)>', '<data:text/html,x>', '<irc://foo.bar>']) {
    const html = renderMarkdown(auto);
    assertSafe(html);
    assert.doesNotMatch(html, /<a /, auto);
  }
  for (const url of ['https://e.com/a?b=1&c=2', 'http://e.com', 'HTTPS://E.COM', 'mailto:a@e.com']) {
    assert.match(renderMarkdown(`[ok](${url})`), LINK, url);
  }
  assert.match(renderMarkdown('<https://e.com>'), LINK);
  assert.match(renderMarkdown('<a@e.com>'), /href="mailto:a@e.com"/);
});

test('input over 20,000 characters is cut there with an ellipsis', () => {
  const html = renderMarkdown('a'.repeat(25_000));
  assert.equal(html, `<p class="vb-md-p">${'a'.repeat(20_000)}…</p>`);
  assert.equal(renderMarkdown('a'.repeat(20_000)), `<p class="vb-md-p">${'a'.repeat(20_000)}</p>`);
});

test('adversarial input renders safe (its time is checked alone: markdown.timing.ts)', () => {
  for (const src of Object.values(ADVERSARIAL)) assertSafe(renderMarkdown(src));
});
