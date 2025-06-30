import { User } from './User';

interface AnnouncementProps {
  id: string;
  title: string;
  info: string;
  createdAt: Date;
  createdBy: User;
  authorAlias: string;
}

class Announcement {
  id: string;
  title: string;
  info: string;
  createdAt: Date;
  createdBy: User;
  authorAlias: string;

  constructor({
    id,
    title,
    info,
    createdAt,
    createdBy,
    authorAlias,
  }: AnnouncementProps) {
    this.id = id;
    this.title = title;
    this.info = info;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
    this.authorAlias = authorAlias;
  }

  static readonly dummy = new Announcement({
    id: 'dummy',
    title: 'Placeholder Announcement',
    info: 'This is a placeholder announcement.',
    createdAt: new Date(),
    createdBy: User.dummy,
    authorAlias: 'dummy',
  });

  static getDateString(announcement: Announcement) {
    const dateString = Announcement.getNiceDateString(announcement.createdAt);
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

export { Announcement, AnnouncementProps };
