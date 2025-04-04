export class CatalogEntryObject {
    id: string;
    name: string;
    desc: string;
    colorPattern: string;
    behavior: string;
    yearsRecorded: string;
    AoR: string;
    currentStatus: string;
    furLength: string;
    furPattern: string;
    tnr: string;
    sex: string;
    credits: string;
  
    constructor(
      id: string,
      name: string,
      desc: string,
      colorPattern: string,
      behavior: string,
      yearsRecorded: string,
      AoR: string,
      currentStatus: string,
      furLength: string,
      furPattern: string,
      tnr: string,
      sex: string,
      credits: string
    ) {
      this.id = id;
      this.name = name;
      this.desc = desc;
      this.colorPattern = colorPattern;
      this.behavior = behavior;
      this.yearsRecorded = yearsRecorded;
      this.AoR = AoR;
      this.currentStatus = currentStatus;
      this.furLength = furLength;
      this.furPattern = furPattern;
      this.tnr = tnr;
      this.sex = sex;
      this.credits = credits;
    }
}