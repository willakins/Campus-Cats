/**
 * Keep VirtualizedList's scroll metrics current on web and bound the amount of
 * row work scheduled in each render batch. React Native's slow-list diagnostic
 * is based on consecutive scroll-event gaps over 500 ms, so the default web
 * event cadence can produce the warning even when individual rows are cheap.
 */
export const virtualizedListPerformanceProps = Object.freeze({
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  scrollEventThrottle: 16,
});
