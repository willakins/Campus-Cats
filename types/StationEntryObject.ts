export class StationEntryObject {
    id: string;
    name: string;
    info: string;
    profilePic: string;
    latitude: string;
    longitude: string;
    timeRestocked: string;
    knownCats: string;
  
    constructor(
      id: string,
      name: string,
      info: string,
      profilePic: string,
      latitude: string,
      longitude: string,
      timeRestocked: string,
      knownCats: string
    ) {
      this.id = id;
      this.name = name;
      this.info = info;
      this.profilePic = profilePic;
      this.latitude = latitude;
      this.longitude = longitude;
      this.timeRestocked = timeRestocked;
      this.knownCats = knownCats;
    }
  }
  