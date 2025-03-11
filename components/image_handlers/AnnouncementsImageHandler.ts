import React from 'react';

interface AnnouncementImageHandlerProps {
  setVisible: (visible: boolean) => void;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  
}

class AnnouncementsImageHandler {
  private setVisible: (visible: boolean) => void;
  private setPhotos: React.Dispatch<React.SetStateAction<string[]>>;

  constructor({
    setVisible,
    setPhotos,
  }: AnnouncementImageHandlerProps) {
    this.setVisible = setVisible;
    this.setPhotos = setPhotos;
  }

  public addPhoto = (newPhotoUri: string) => {
    console.log('adding photos!')
    this.setPhotos((prevPics) => [
      ...prevPics,
      newPhotoUri,
    ]);
  };
}
export { AnnouncementsImageHandler };