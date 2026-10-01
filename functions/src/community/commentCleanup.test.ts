import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CommentThreadStore,
  cleanupCommentThread,
} from './commentCleanup';

describe('comment cleanup', () => {
  it('removes a large thread in bounded batches', async () => {
    const remaining = Array.from({ length: 925 }, (_, index) => `comment-${index}`);
    const batchSizes: number[] = [];
    const store: CommentThreadStore = {
      async listIds(_collection, targetKey, limit) {
        assert.equal(targetKey, 'sighting:sighting-1');
        assert.equal(limit, 400);
        return remaining.slice(0, limit);
      },
      async remove(collection, ids) {
        assert.equal(collection, 'sighting-comments');
        batchSizes.push(ids.length);
        remaining.splice(0, ids.length);
      },
    };

    await cleanupCommentThread(
      store,
      'sighting-comments',
      'sighting:sighting-1',
    );

    assert.deepEqual(batchSizes, [400, 400, 125]);
    assert.deepEqual(remaining, []);
  });
});
