import { virtualizedListPerformanceProps } from './virtualizedListPerformance';

describe('virtualized list performance defaults', () => {
  it('keeps scroll metrics current and bounds row batches', () => {
    expect(virtualizedListPerformanceProps).toEqual({
      initialNumToRender: 8,
      maxToRenderPerBatch: 8,
      updateCellsBatchingPeriod: 32,
      windowSize: 7,
      scrollEventThrottle: 16,
    });
  });
});
