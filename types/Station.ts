import { LatLng } from 'react-native-maps';

import { User } from './User';

interface StationProps {
  id: string;
  name: string;
  location: LatLng;
  lastStocked: Date;
  stockingFreq: number;
  knownCats: string;
  isStocked: boolean;
  createdBy: User;
}

class Station {
  id: string;
  name: string;
  location: LatLng;
  lastStocked: Date;
  stockingFreq: number;
  knownCats: string;
  isStocked: boolean;
  createdBy: User;

  constructor({
    id,
    name,
    location,
    lastStocked,
    stockingFreq,
    knownCats,
    isStocked,
    createdBy,
  }: StationProps) {
    this.id = id;
    this.name = name;
    (this.location = location), (this.lastStocked = lastStocked);
    this.stockingFreq = stockingFreq;
    this.knownCats = knownCats;
    this.isStocked = isStocked;
    this.createdBy = createdBy;
  }

  static readonly dummy = new Station({
    id: 'dummy',
    name: 'Unknown Station',
    location: { latitude: 0, longitude: 0 },
    lastStocked: new Date(),
    stockingFreq: 7,
    knownCats: 'N/A',
    isStocked: false,
    createdBy: User.dummy,
  });

  public static calculateStocked(
    lastStocked: Date,
    stockingFreq: number,
  ): boolean {
    const nextRestockDate = new Date(lastStocked); // clone
    nextRestockDate.setDate(nextRestockDate.getDate() + stockingFreq);
    const today = new Date();
    return today < nextRestockDate;
  }

  public static calculateDaysLeft(
    lastStocked: Date,
    stockingFreq: number,
  ): number {
    if (isNaN(lastStocked.getTime())) return 0;

    const nextRestockDate = new Date(lastStocked); // clone
    nextRestockDate.setDate(nextRestockDate.getDate() + stockingFreq);
    const today = new Date();

    const timeDiff = nextRestockDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return isNaN(daysRemaining) ? -2 : daysRemaining;
  }
}
export { Station, StationProps };
