import { Outcome, failure, success } from '../../core/domain';
import { ImageSelectionPort, SelectedImage } from '../../core/ports';

interface ImageSelectionDependencies {
  readonly images: ImageSelectionPort;
}

export class ImageSelectionModule {
  constructor(private readonly dependencies: ImageSelectionDependencies) {}

  async pickFromLibrary(): Promise<Outcome<SelectedImage | undefined>> {
    try {
      return success(await this.dependencies.images.pickFromLibrary());
    } catch {
      return failure('dependency_failure', 'Could not open the media library');
    }
  }

  async takePhoto(): Promise<Outcome<SelectedImage | undefined>> {
    try {
      return success(await this.dependencies.images.takePhoto());
    } catch {
      return failure('dependency_failure', 'Could not open the camera');
    }
  }
}
