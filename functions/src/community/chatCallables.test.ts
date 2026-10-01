import assert from 'node:assert/strict';
import test from 'node:test';

import * as chatCallables from './chatCallables';

test('the chat deployment exposes only secret-free chat callables', () => {
  assert.deepEqual(Object.keys(chatCallables).sort(), [
    'markChatPingsRead',
    'muteChatUser',
    'sendChatMessage',
    'setChatReaction',
    'setChatUserBanned',
  ]);

  for (const callable of Object.values(chatCallables)) {
    assert.equal(callable.__endpoint.platform, 'gcfv2');
    assert.deepEqual(callable.__endpoint.secretEnvironmentVariables, undefined);
  }
});
