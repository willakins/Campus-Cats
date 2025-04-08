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

  constructor(props: SightingProps) {
    this.id = props.id;
    this.name = props.name;
    this.info = props.info;
    this.fed = props.fed;
    this.health = props.health;
    this.date = props.date;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.uid = props.uid;
    this.timeofDay = props.timeofDay;
  }
}
export { Sighting };
