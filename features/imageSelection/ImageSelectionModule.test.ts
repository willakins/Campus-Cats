import { InMemoryImageSelection } from '../../adapters/inMemory/InMemoryImageSelection';
import { ImageSelectionModule } from './ImageSelectionModule';

describe('ImageSelectionModule', () => {
  it('returns camera and library choices through typed outcomes', async () => {
    const images = new InMemoryImageSelection();
    images.queueCamera('file://camera.jpg');
    images.queueLibrary('file://library.jpg');
    const module = new ImageSelectionModule({ images });

    await expect(module.takePhoto()).resolves.toMatchObject({
      ok: true,
      value: { localUri: 'file://camera.jpg' },
    });
    await expect(module.pickFromLibrary()).resolves.toMatchObject({
      ok: true,
      value: { localUri: 'file://library.jpg' },
    });
  });

  it('preserves cancellation and dependency failures', async () => {
    const images = new InMemoryImageSelection();
    images.queueLibrary(undefined);
    const module = new ImageSelectionModule({ images });
    await expect(module.pickFromLibrary()).resolves.toEqual({
      ok: true,
      value: undefined,
      warnings: [],
    });
    images.failNext('takePhoto', new Error('camera unavailable'));
    await expect(module.takePhoto()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
