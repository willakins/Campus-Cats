import BaseImageHandler from './BaseImageHandler';

interface AnnouncementImageHandlerProps {
  setVisible: (visible: boolean) => void;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
}

class AnnouncementsImageHandler extends BaseImageHandler {
  private setVisible;
  private setPhotos;

  constructor({ setVisible, setPhotos }: AnnouncementImageHandlerProps) {
    super();
    this.setVisible = setVisible;
    this.setPhotos = setPhotos;
  }

  protected onPhotoSelected(uri: string): void {
    console.log('adding announcement photo');
    this.setPhotos((prev) => [...prev, uri]);
  }
}

export { AnnouncementsImageHandler };
