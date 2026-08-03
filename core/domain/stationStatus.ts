import { Clock } from './dependencies';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface StationStockStatus {
  readonly isStocked: boolean;
  readonly daysRemaining: number;
}

export function calculateStationStockStatus(
  lastStocked: Date,
  stockingFrequencyDays: number,
  clock: Clock,
): StationStockStatus {
  const nextRestockAt =
    lastStocked.getTime() + stockingFrequencyDays * DAY_IN_MILLISECONDS;
  const difference = nextRestockAt - clock.now().getTime();
  const daysRemaining = Math.ceil(difference / DAY_IN_MILLISECONDS);

  return {
    isStocked: difference > 0,
    daysRemaining,
  };
}
