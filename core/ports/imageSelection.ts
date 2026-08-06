export interface SelectedImage {
  readonly localUri: string;
}

export interface ImageSelectionPort {
  pickFromLibrary(): Promise<SelectedImage | undefined>;
  takePhoto(): Promise<SelectedImage | undefined>;
}
