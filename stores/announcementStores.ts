import { Announcement } from '@/types';

let selectedAnnouncement: Announcement = Announcement.dummy;

export const setSelectedAnnouncement = (announcement: Announcement) => {
  selectedAnnouncement = announcement;
};

export const getSelectedAnnouncement = () => selectedAnnouncement;
