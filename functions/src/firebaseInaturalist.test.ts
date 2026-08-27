import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  importedCommentDocumentId,
  observationCommentDocument,
} from './firebaseInaturalist';
import { ObservationCommentImport } from './inaturalist';

describe('Firebase iNaturalist comment persistence', () => {
  it('uses stable source IDs and stores an attributed sighting comment', () => {
    const comment: ObservationCommentImport = {
      schemaVersion: 1,
      id: 22894482,
      uuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
      observationId: 321,
      sourceUrl:
        'https://www.inaturalist.org/observations/321#comment-22894482',
      body: 'Pretty sure this is Charles!',
      createdAt: new Date('2026-08-11T02:53:45.000Z'),
      sourceUpdatedAt: new Date('2026-08-11T02:53:45.000Z'),
      author: {
        id: 8358607,
        login: 'chipmunkt',
        displayName: 'Chip Munk',
        sourceUrl: 'https://www.inaturalist.org/people/chipmunkt',
      },
      lastSeenRunId: 'run-1',
    };

    assert.equal(
      importedCommentDocumentId(comment.uuid),
      'inat-comment-e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
    );
    const document = observationCommentDocument(comment);
    assert.deepEqual(document.target, {
      kind: 'sighting',
      id: 'inat-observation-321',
      documentId: '321',
    });
    assert.equal(document.targetKey, 'sighting:inat-observation-321');
    assert.equal(document.source, 'inaturalist');
    assert.equal(document.sourceCommentId, 22894482);
    assert.deepEqual(document.externalAuthor, comment.author);
    assert.equal(
      (document.createdAt as { toDate(): Date }).toDate().toISOString(),
      '2026-08-11T02:53:45.000Z',
    );
  });
});
