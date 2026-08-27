import { AnnouncementDraft } from './AnnouncementsModule';

export type ParticipationAnnouncementTarget =
  | 'survey'
  | 'contest'
  | 'presidential_election';

export const participationAnnouncementDraft = (
  target: ParticipationAnnouncementTarget,
  title: string,
): AnnouncementDraft => ({
  title: title.trim(),
  info: {
    survey:
      'A new survey is open. Visit Community and choose Surveys to participate.',
    contest:
      'A new vote is open. Visit Community and choose Votes to cast your vote.',
    presidential_election:
      'A new president election has started. Visit Community and choose Votes to nominate or vote.',
  }[target],
  authorAlias: '',
  photos: [],
});
