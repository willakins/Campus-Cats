import { RandomPasswordGenerator } from './RandomPasswordGenerator';

jest.mock('react-native-get-random-values', () => ({}));

it('uses secure random bytes and discards samples that would bias character selection', () => {
  let calls = 0;
  const generator = new RandomPasswordGenerator((bytes) => {
    bytes.fill(calls++ === 0 ? 255 : 0);
    return bytes;
  });
  expect(generator.generate(16)).toBe('a'.repeat(16));
  expect(calls).toBe(2);
});

it('uses Web Crypto by default and fails when secure entropy is unavailable', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const getRandomValues = jest.fn((bytes: Uint8Array) => bytes.fill(1));
  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    });
    expect(new RandomPasswordGenerator().generate(12)).toBe('b'.repeat(12));
    expect(getRandomValues).toHaveBeenCalled();
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });
    expect(() => new RandomPasswordGenerator().generate(12)).toThrow();
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});

it.each([0, -1, 1.5, 4097])('rejects invalid password length %s', (length) => {
  expect(() => new RandomPasswordGenerator().generate(length)).toThrow();
});
