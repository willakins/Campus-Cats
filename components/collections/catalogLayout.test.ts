import { catalogColumnCount } from './catalogLayout';

describe('catalog responsive grid', () => {
  it.each([
    [320, 1, 1],
    [390, 2, 1],
    [390, 1, 2],
    [768, 1, 3],
    [1280, 1, 3],
  ] as const)('uses %i columns at %ipx and %ix text', (width, fontScale, columns) => {
    expect(catalogColumnCount(width, fontScale)).toBe(columns);
  });
});
