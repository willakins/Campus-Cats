import { catalogCardWidth, catalogColumnCount } from './catalogLayout';

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

describe('catalog card sizing', () => {
  it.each([
    [320, 1, 280],
    [390, 2, 167],
    [768, 3, 216],
    [1440, 3, 216],
  ] as const)('keeps every %i-column card equal at %ipx', (width, columns, expected) => {
    expect(catalogCardWidth(width, columns, 20, 720, 16)).toBe(expected);
  });
});
