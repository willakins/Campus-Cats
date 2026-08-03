import {
  FixedClock,
  SequenceIdGenerator,
  calculateStationStockStatus,
  sightingIdSchema,
} from './index';

describe('deterministic domain dependencies', () => {
  it('derives station freshness from an injected clock', () => {
    const clock = new FixedClock(new Date('2025-04-15T12:00:00.000Z'));

    expect(
      calculateStationStockStatus(
        new Date('2025-04-10T12:00:00.000Z'),
        7,
        clock,
      ),
    ).toEqual({ isStocked: true, daysRemaining: 2 });
    expect(
      calculateStationStockStatus(
        new Date('2025-04-01T12:00:00.000Z'),
        7,
        clock,
      ),
    ).toEqual({ isStocked: false, daysRemaining: -7 });
  });

  it('provides deterministic IDs without accepting empty IDs', () => {
    const ids = new SequenceIdGenerator(['first-id', 'second-id']);

    expect(ids.next()).toBe('first-id');
    expect(ids.next()).toBe('second-id');
    expect(() => ids.next()).toThrow('No deterministic IDs remain');
    expect(() => sightingIdSchema.parse('')).toThrow();
  });
});
