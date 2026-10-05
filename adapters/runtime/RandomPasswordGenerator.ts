import 'react-native-get-random-values';
import { PasswordGenerator } from '../../core/ports';

const CHARACTERS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
const UNBIASED_BYTE_LIMIT =
  Math.floor(256 / CHARACTERS.length) * CHARACTERS.length;

export class RandomPasswordGenerator implements PasswordGenerator {
  constructor(
    private readonly fillRandom: (
      bytes: Uint8Array<ArrayBuffer>,
    ) => Uint8Array<ArrayBuffer> = (bytes) =>
      globalThis.crypto.getRandomValues(bytes),
  ) {}

  generate(length: number): string {
    if (!Number.isInteger(length) || length <= 0 || length > 4096) {
      throw new Error('Password length must be an integer from 1 to 4096');
    }
    let password = '';
    while (password.length < length) {
      const bytes = this.fillRandom(
        new Uint8Array(Math.min(256, length - password.length)),
      );
      for (const byte of bytes) {
        if (byte < UNBIASED_BYTE_LIMIT)
          password += CHARACTERS[byte % CHARACTERS.length];
      }
    }
    return password;
  }
}
