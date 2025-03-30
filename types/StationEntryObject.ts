export class StationEntryObject {
    id: string;
    name: string;
    profilePic: string;
    longitude: number;
    latitude: number;
    lastStocked: string;
    stockingFreq:number;
    knownCats: string;
    isStocked: boolean;
  
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
      this.isStocked = StationEntryObject.calculateStocked(lastStocked, stockingFreq);
    }

    private static calculateStocked(lastStocked:string, stockingFreq:number) {
      const lastStockedDate = new Date(lastStocked);

      const nextRestockDate = lastStockedDate;
      nextRestockDate.setDate(lastStockedDate.getDate() + stockingFreq);
      const today = new Date(); // Get today's date
      return !(today >= nextRestockDate);    }
  }