export class StationEntryObject {
    id: string;
    name: string;
    profilePic: string;
    longitude: number;
    latitude: number;
    lastStocked: string;
    stockingFreq:number;
    knownCats: string;
  
    constructor(
      id: string,
      name: string,
      profilePic: string,
      longitude: number,
      latitude: number,
      lastStocked: string,
      stockingFreq: number,
      knownCats: string
    ) {
      this.id = id;
      this.name = name;
      this.profilePic = profilePic;
      this.latitude = latitude;
      this.longitude = longitude;
      this.lastStocked = lastStocked;
      this.stockingFreq = stockingFreq;
      this.knownCats = knownCats;
    }
  }