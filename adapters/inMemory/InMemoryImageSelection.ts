import { ImageSelectionPort, SelectedImage } from '../../core/ports';

type Operation = 'pickFromLibrary' | 'takePhoto';

export class InMemoryImageSelection implements ImageSelectionPort {
  readonly #library: (SelectedImage | undefined)[] = [];
  readonly #camera: (SelectedImage | undefined)[] = [];
  readonly #failures = new Map<Operation, Error>();

  queueLibrary(localUri: string | undefined): void {
    this.#library.push(localUri ? { localUri } : undefined);
  }

  queueCamera(localUri: string | undefined): void {
    this.#camera.push(localUri ? { localUri } : undefined);
  }

  failNext(operation: Operation, error: Error): void {
    this.#failures.set(operation, error);
  }

  async pickFromLibrary(): Promise<SelectedImage | undefined> {
    this.maybeFail('pickFromLibrary');
    return this.#library.shift();
  }

  async takePhoto(): Promise<SelectedImage | undefined> {
    this.maybeFail('takePhoto');
    return this.#camera.shift();
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
