import { LatLng } from 'react-native-maps';

import { User } from './User';

interface SightingProps {
  id: string;
  name: string;
  info: string;
  fed: boolean;
  health: boolean;
  date: Date;
  location: LatLng;
  createdBy: User;
  timeofDay: string;
}

class Sighting {
  id: string;
  name: string;
  info: string;
  fed: boolean;
  health: boolean;
  date: Date;
  location: LatLng;
  createdBy: User;
  timeofDay: string;

  constructor({
    id,
    name,
    info,
    fed,
    health,
    date,
    location,
    createdBy,
    timeofDay,
  }: SightingProps) {
    this.id = id;
    this.name = name;
    this.info = info;
    this.fed = fed;
    this.health = health;
    this.date = date;
    this.location = location;
    this.createdBy = createdBy;
    this.timeofDay = timeofDay;
  }

  static readonly dummy = new Sighting({
    id: 'dummy',
    name: 'Unknown Cat',
    info: 'This is a placeholder sighting.',
    fed: false,
    health: false,
    date: new Date(),
    location: { latitude: 0, longitude: 0 },
    createdBy: User.dummy,
    timeofDay: 'Unknown',
  });

  static getDateString(sighting: Sighting) {
    const dateString = Sighting.getNiceDateString(sighting.date);
    return `${sighting.timeofDay} of ${dateString}`;
  }

  private static getNiceDateString(date: Date) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}

export { Sighting, SightingProps };
