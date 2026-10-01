import { floatingTabSelectionOffset } from './floatingTabBar';

describe('floating tab selection', () => {
  it('centers the selection surface under each member tab', () => {
    expect(floatingTabSelectionOffset(326, 4, 0)).toBeCloseTo(26.75);
    expect(floatingTabSelectionOffset(326, 4, 3)).toBeCloseTo(247.25);
  });

  it('keeps five officer tabs evenly spaced within the same inset bar', () => {
    expect(floatingTabSelectionOffset(326, 5, 0)).toBeCloseTo(19.4);
    expect(floatingTabSelectionOffset(326, 5, 4)).toBeCloseTo(254.6);
  });

  it('clamps stale route indexes to the available tabs', () => {
    expect(floatingTabSelectionOffset(326, 4, 8)).toBeCloseTo(247.25);
  });
});
