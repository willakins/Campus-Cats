import assert from 'node:assert/strict';
import test from 'node:test';
import { requestSourceAddress } from './requestSourceAddress';

test('client-supplied forwarding prefixes cannot change the rate-limit identity', () => {
  for (const header of [
    '192.0.2.10',
    '198.51.100.1, 192.0.2.10',
    'spoof, 198.51.100.2, 192.0.2.10',
  ]) {
    assert.equal(
      requestSourceAddress({
        get: () => header,
        socket: { remoteAddress: '127.0.0.1' },
      }),
      '192.0.2.10',
    );
  }
});

test('missing or malformed forwarding headers use the connection address', () => {
  for (const header of [undefined, '', 'not-an-address']) {
    assert.equal(
      requestSourceAddress({
        get: () => header,
        socket: { remoteAddress: '127.0.0.1' },
      }),
      '127.0.0.1',
    );
  }
});
