import { SequenceIdGenerator } from '../domain';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import { MediaCoordinator, storedMedia, localMedia } from './MediaCoordinator';

describe('MediaCoordinator', () => {
  it('reconciles profile and gallery media after persistence succeeds', async () => {
    const media = new InMemoryMediaStore([
      {
        id: 'catalog/cat-1/profile-old.jpg',
        url: 'memory://profile-old',
        role: 'profile',
      },
      {
        id: 'catalog/cat-1/gallery-old.jpg',
        url: 'memory://gallery-old',
        role: 'gallery',
      },
    ]);
    const coordinator = new MediaCoordinator(
      media,
      new SequenceIdGenerator(['new-profile', 'new-gallery']),
    );
    let persistedIds: readonly string[] = [];

    const result = await coordinator.reconcile({
      folder: 'catalog/cat-1',
      profile: localMedia('file://new-profile.jpg'),
      gallery: [
        storedMedia('catalog/cat-1/gallery-old.jpg'),
        localMedia('file://new-gallery.jpg'),
      ],
      persist: async (assets) => {
        persistedIds = [assets.profile.id, ...assets.gallery.map(({ id }) => id)];
      },
    });

    expect(result.ok).toBe(true);
    expect(persistedIds).toEqual([
      'catalog/cat-1/profile-new-profile.jpg',
      'catalog/cat-1/gallery-old.jpg',
      'catalog/cat-1/new-gallery.jpg',
    ]);
    expect(media.ids()).toEqual([
      'catalog/cat-1/gallery-old.jpg',
      'catalog/cat-1/new-gallery.jpg',
      'catalog/cat-1/profile-new-profile.jpg',
    ]);
  });

  it('removes new uploads and preserves existing media when persistence fails', async () => {
    const media = new InMemoryMediaStore([
      {
        id: 'cat-sightings/sighting-1/profile.jpg',
        url: 'memory://profile',
        role: 'profile',
      },
    ]);
    const coordinator = new MediaCoordinator(
      media,
      new SequenceIdGenerator(['replacement']),
    );

    const result = await coordinator.reconcile({
      folder: 'cat-sightings/sighting-1',
      profile: localMedia('file://replacement.jpg'),
      gallery: [],
      persist: async () => {
        throw new Error('Firestore unavailable');
      },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not persist media changes',
      },
    });
    expect(media.ids()).toEqual(['cat-sightings/sighting-1/profile.jpg']);
  });

  it('reports cleanup failure as a warning after persistence succeeds', async () => {
    const media = new InMemoryMediaStore([
      {
        id: 'stations/station-1/obsolete.jpg',
        url: 'memory://obsolete',
        role: 'gallery',
      },
    ]);
    media.failNext('remove', new Error('Storage cleanup failed'));
    const coordinator = new MediaCoordinator(
      media,
      new SequenceIdGenerator(['profile']),
    );

    const result = await coordinator.reconcile({
      folder: 'stations/station-1',
      profile: localMedia('file://profile.jpg'),
      gallery: [],
      persist: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      warnings: [
        {
          code: 'cleanup_failed',
          message: 'Saved changes, but some obsolete media could not be removed',
        },
      ],
    });
    expect(media.ids()).toContain('stations/station-1/obsolete.jpg');
  });
});
