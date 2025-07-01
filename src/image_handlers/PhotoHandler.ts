import BaseImageHandler from './BaseImageHandler';

class PhotoHandler extends BaseImageHandler {
  private onPhotoCallback: (uri: string) => void;

  constructor(onPhotoSelected: (uri: string) => void) {
    super();
    this.onPhotoCallback = onPhotoSelected;
  }

  protected onPhotoSelected(uri: string): void {
    this.onPhotoCallback(uri);
  }
}
export { PhotoHandler };
