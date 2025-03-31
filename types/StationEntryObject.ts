export class StationEntryObject {
    id: string;
    name: string;
    longitude: number;
    latitude: number;
    lastStocked: string;
    stockingFreq:string;
    knownCats: string;
    isStocked: boolean;
  
    constructor(
      id: string,
      name: string,
      longitude: number,
      latitude: number,
      lastStocked: string,
      stockingFreq: string,
      knownCats: string
    ) {
      this.id = id;
      this.name = name;
      this.latitude = latitude;
      this.longitude = longitude;
      this.lastStocked = lastStocked;
      this.stockingFreq = stockingFreq;
      this.knownCats = knownCats;
      this.isStocked = StationEntryObject.calculateStocked(lastStocked, stockingFreq);
    }

    public static calculateStocked(lastStocked:string, stockingFreq:string) {
      const lastStockedDate = new Date(lastStocked);

      const nextRestockDate = lastStockedDate;
      nextRestockDate.setDate(lastStockedDate.getDate() + parseInt(stockingFreq));
      const today = new Date(); // Get today's date
      return !(today >= nextRestockDate);
    }
  }