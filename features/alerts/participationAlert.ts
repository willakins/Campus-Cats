import { AlertDraft } from './AlertsModule';

export type ParticipationAlertTarget =
  | 'survey'
  | 'contest'
  | 'presidential_election';

export const participationAlertDraft = (
  target: ParticipationAlertTarget,
  title: string,
): AlertDraft => ({
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
