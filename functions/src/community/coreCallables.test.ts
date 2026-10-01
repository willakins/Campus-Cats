import assert from 'node:assert/strict';
import test from 'node:test';

import * as coreCallables from './coreCallables';

test('the core deployment exposes only ballot submission and profile sync', () => {
  assert.deepEqual(Object.keys(coreCallables).sort(), [
    'submitCommunityBallot',
    'syncPublicProfile',
  ]);

  for (const callable of Object.values(coreCallables)) {
    assert.equal(callable.__endpoint.platform, 'gcfv2');
    assert.deepEqual(callable.__endpoint.secretEnvironmentVariables, undefined);
  }
});
