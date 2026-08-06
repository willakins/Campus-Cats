import { PasswordGenerator } from '../../core/ports';

const CHARACTERS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';

export class RandomPasswordGenerator implements PasswordGenerator {
  constructor(private readonly random: () => number = Math.random) {}

  generate(length: number): string {
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error('Password length must be a positive integer');
    }
    return Array.from({ length }, () =>
      CHARACTERS.charAt(Math.floor(this.random() * CHARACTERS.length)),
    ).join('');
  }
}
