// What the page says around an app card's buttons (app-cards FE_02, board/words/app-cards.ts): the confirms
// before Allow and Stop app, the toasts after, and what Check again and Restart found.
import assert from 'node:assert/strict';
import test from 'node:test';
import { appAsk, appDone, retryDone } from '../src/board/words/app-cards.ts';

test('Allow asks first, saying who wrote the app and what it may do; again after a change; Stop app says what stops', () => {
  assert.deepEqual(appAsk('app-allow', 'Calculator', false), ['Allow Calculator to run?',
    'The agent wrote this app. It runs on this computer and can use the internet, but it can\'t change your files.', 'Allow']);
  assert.match(appAsk('app-allow', 'Calculator', true)[0], /^Allow Calculator again\?$/);
  assert.match(appAsk('app-allow', 'Calculator', true)[1], /^The agent changed this app since you allowed it\. /);
  assert.deepEqual(appAsk('app-revoke', 'Calculator', false), ['Stop Calculator?', 'It stops now and won\'t run until you allow it again.', 'Stop app']);
});

test('the toast after Allow and Stop app, and after Check again or Restart', () => {
  assert.equal(appDone('app-allow', 'Calculator'), 'Calculator allowed');
  assert.equal(appDone('app-revoke', 'Calculator'), 'Calculator stopped');
  assert.equal(retryDone('Calculator', 'invalid', 'invalid'), 'Calculator still has problems.');
  assert.equal(retryDone('Calculator', 'broken', 'broken'), 'Calculator is still stopped.');
  assert.equal(retryDone('Calculator', 'broken', 'needs-approval'), 'Calculator updated');
});

test('Check again on an app not found: found once its folder is back, else still not found (finding 1)', () => {
  assert.equal(retryDone('Notice', 'missing', 'ready'), 'Notice found');
  assert.equal(retryDone('Notice', 'missing', 'missing'), 'Notice still not found.');
});

test('Check again on an app whose folder went since it had problems says not found, as its card does (finding 27)', () => {
  assert.equal(retryDone('Notice', 'invalid', 'missing'), 'Notice not found');
  assert.equal(retryDone('Notice', 'broken', 'missing'), 'Notice not found');
  assert.equal(retryDone('Notice', 'invalid', 'ready'), 'Notice updated');
});
