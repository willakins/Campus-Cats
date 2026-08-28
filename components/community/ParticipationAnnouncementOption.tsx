import React from 'react';

import { FormSection } from '@/components/design';
import { ChoiceField } from '@/components/forms';

interface ParticipationAnnouncementOptionProps {
  readonly checked: boolean;
  readonly subject: 'survey' | 'vote';
  readonly onChange: (checked: boolean) => void;
}

export const ParticipationAnnouncementOption = ({
  checked,
  subject,
  onChange,
}: ParticipationAnnouncementOptionProps) => {
  return (
    <FormSection title="Announcement">
      <ChoiceField
        appearance="plain"
        label="Create an announcement"
        accessibilityLabel={`Create an announcement for this ${subject}`}
        helper={`Tell members that this ${subject} is ready for participation.`}
        checked={checked}
        onChange={onChange}
      />
    </FormSection>
  );
};
