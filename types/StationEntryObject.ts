export class StationEntryObject {
    id: string;
    name: string;
    profile: string;
    longitude: number;
    latitude: number;
    lastStocked: string;
    stockingFreq:string;
    knownCats: string;
    isStocked: boolean;
  
    constructor(
      id: string,
      name: string,
      profile: string,
      longitude: number,
      latitude: number,
      lastStocked: string,
      stockingFreq: string,
      knownCats: string
    ) {
      this.id = id;
      this.name = name;
      this.profile = profile;
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

    public static calculateDaysLeft(lastStocked:string, stockingFreq:string) {
      const lastStockedDate = new Date(lastStocked);
      if (isNaN(lastStockedDate.getTime())) return 0; // Handle invalid date
  
      const nextRestockDate = new Date(lastStockedDate);
      const newDate = lastStockedDate.getDate() + parseInt(stockingFreq);
      nextRestockDate.setDate(newDate);
      const today = new Date();
      const timeDiff = nextRestockDate.getTime() - today.getTime();
      
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
      if (isNaN(daysRemaining)) return -2;
  
      return daysRemaining;
    }
  }