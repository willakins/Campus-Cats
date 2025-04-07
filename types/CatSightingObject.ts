export class CatSightingObject {
  id: string;
  name: string;
  info: string;
  photoUrl: string;
  fed: boolean;
  health: boolean;
  date: Date;
  latitude: number;
  longitude: number;
  uid: string;
  timeofDay:string;


  constructor(
    id: string,
    name: string,
    info: string,
    photoUrl: string,
    fed: boolean,
    health: boolean,
    date: Date,
    latitude: number,
    longitude: number,
    uid: string,
    timeofDay:string,
  ) {
    this.id = id;
    this.date = date;
    this.fed = fed;
    this.health = health;
    this.photoUrl = photoUrl;
    this.info = info;
    this.latitude = latitude;
    this.longitude = longitude;
    this.name = name;
    this.uid =uid;
    this.timeofDay = timeofDay;
  }
}

