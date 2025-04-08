import { User } from './User';
import { LatLng } from 'react-native-maps';

interface SightingProps {
  id: string;
  name: string;
  info: string;
  fed: boolean;
  health: boolean;
  date: Date;
  location: LatLng;
  user: User;
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
  user: User;
  timeofDay: string;

  constructor({
    id,
    name,
    info,
    fed,
    health,
    date,
    location,
    user,
    timeofDay,
  }: SightingProps) {
    this.id = id;
    this.name = name;
    this.info = info;
    this.fed = fed;
    this.health = health;
    this.date = date;
    this.location = location;
    this.user = user;
    this.timeofDay = timeofDay;
  }

  static readonly dummy = new Sighting({
    id: "dummy",
    name: "Unknown Cat",
    info: "This is a placeholder sighting.",
    fed: false,
    health: false,
    date: new Date(),
    location: { latitude: 0, longitude: 0 },
    user: User.dummy,
    timeofDay: "Unknown",
  });

  static getDateString (sighting:Sighting) {
    const dateString = sighting.date.toISOString().split('T')[0];
    return `${sighting.timeofDay} of ${dateString}`;
  }
}

export { Sighting, SightingProps };
