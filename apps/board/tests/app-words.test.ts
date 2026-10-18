// What the page says around an app card's buttons (app-cards FE_02, app-words.ts): the confirms
// before Allow and Stop app, the toasts after, and what Check again and Restart found.
import assert from 'node:assert/strict';
import test from 'node:test';
import { appAsk, appDone, retryDone } from '../src/board/app-words.ts';

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
