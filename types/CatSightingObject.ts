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
    
  
    constructor(
        id: string,
        name: string,
        info: string,
        photoUrl: string,
        fed: boolean,
        health: boolean,
        date: Date,
        latitude: number,
        longitude: number
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
    }
  }
  