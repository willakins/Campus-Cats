import React from 'react';

import { FormSection } from '@/presentation/ui';
import { ChoiceField } from '@/presentation/forms';

interface ParticipationAlertOptionProps {
  readonly checked: boolean;
  readonly subject: 'survey' | 'vote';
  readonly onChange: (checked: boolean) => void;
}

export const ParticipationAlertOption = ({
  checked,
  subject,
  onChange,
}: ParticipationAlertOptionProps) => {
  return (
    <FormSection title="Alert">
      <ChoiceField
        appearance="plain"
        label="Create an alert"
        accessibilityLabel={`Create an alert for this ${subject}`}
        helper={`Tell members that this ${subject} is ready for participation.`}
        checked={checked}
        onChange={onChange}
      />
    </FormSection>
  );
};
