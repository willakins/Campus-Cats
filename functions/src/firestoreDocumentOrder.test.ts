import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareFirestoreDocumentIds } from './admin/firestoreDocumentOrder';

describe('Firestore document ID ordering', () => {
  it('uses UTF-8 byte order instead of locale-aware order', () => {
    const ids = ['member-z', 'member-A', 'member-a', 'member-Z'];

    assert.deepEqual(ids.sort(compareFirestoreDocumentIds), [
      'member-A',
      'member-Z',
      'member-a',
      'member-z',
    ]);
  });
});
