// The side panel's chat agent is labelled by the board's folder name (search-and-finding ACCESS_01,
// ruling 321): the folder's last part, not a path, so the requests strip names a bot by where it works.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatLabel } from '../server/chat-access.ts';

test('chatLabel is the folder\'s name, not its path', () => {
  assert.equal(chatLabel('claude', '/work/projects/pricing-site'), 'pricing-site');
  assert.equal(chatLabel('kiro', '/work/projects/pricing-site/'), 'pricing-site');
});

test('chatLabel falls back to the CLI\'s name for a folder with no name', () => {
  assert.equal(chatLabel('claude', '/'), 'Claude Code');
});
