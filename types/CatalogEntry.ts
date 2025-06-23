import { User } from './User';

type TNRStatus = 'Yes' | 'No' | 'Unknown';
type Sex = 'Male' | 'Female' | 'Unknown';
type CatStatus =
  | 'Feral'
  | 'Adopted'
  | 'Deceased'
  | 'Feral'
  | 'Frat Cat'
  | 'Unknown';
type Fur = 'Short' | 'Medium' | 'Long' | 'Unknown';

interface Cat {
  name: string;
  descShort: string;
  descLong: string;
  colorPattern: string;
  behavior: string;
  yearsRecorded: string;
  AoR: string;
  currentStatus: CatStatus;
  furLength: Fur;
  furPattern: string;
  tnr: TNRStatus;
  sex: Sex;
}

interface CatalogEntryProps {
  id: string;
  cat: Cat;
  credits: string;
  createdAt: Date;
  createdBy: User;
}

class CatalogEntry {
  id: string;
  cat: Cat;
  credits: string;
  createdAt: Date;
  createdBy: User;

  constructor({ id, cat, credits, createdAt, createdBy }: CatalogEntryProps) {
    this.id = id;
    this.cat = cat;
    this.credits = credits;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
  }

  static readonly dummy = new CatalogEntry({
    id: 'dummy',
    cat: {
      name: 'Unnamed Cat',
      descShort: 'No description available.',
      descLong:
        'This is a placeholder catalog entry for an unidentified or sample cat.',
      colorPattern: 'Unknown',
      behavior: 'Unknown',
      yearsRecorded: 'N/A',
      AoR: 'N/A',
      currentStatus: 'Unknown',
      furLength: 'Unknown',
      furPattern: 'Unknown',
      tnr: 'Unknown',
      sex: 'Unknown',
    },
    credits: 'N/A',
    createdAt: new Date(),
    createdBy: User.dummy,
  });

  static getDateString(entry: CatalogEntry) {
    const dateString = CatalogEntry.getNiceDateString(entry.createdAt);
    return `Posted on ${dateString}`;
  }

  private static getNiceDateString(date: Date) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}
export { CatalogEntry, CatalogEntryProps, Cat, TNRStatus, Sex, CatStatus, Fur };
