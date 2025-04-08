interface SightingProps {
  id: string;
  name: string;
  info: string;
  fed: boolean;
  health: boolean;
  date: string;
  latitude: number;
  longitude: number;
  uid: string;
  timeofDay: string;
}

class Sighting {
  id: string;
  name: string;
  info: string;
  fed: boolean;
  health: boolean;
  date: string;
  latitude: number;
  longitude: number;
  uid: string;
  timeofDay: string;

  constructor({
    id,
    name,
    info,
    fed,
    health,
    date,
    latitude,
    longitude,
    uid,
    timeofDay,
  }: SightingProps) {
    this.id = id;
    this.name = name;
    this.info = info;
    this.fed = fed;
    this.health = health;
    this.date = date;
    this.latitude = latitude;
    this.longitude = longitude;
    this.uid = uid;
    this.timeofDay = timeofDay;
  }
}
export { Sighting };