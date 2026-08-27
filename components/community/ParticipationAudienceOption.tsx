import React from 'react';
import { View } from 'react-native';

import { ParticipationAudience } from '../../core/domain';
import { useAppTheme } from '../../theme';
import {
  AppText,
  FormSection,
  SegmentedControl,
} from '../design';

export const ParticipationAudienceOption = ({
  value,
  onChange,
}: {
  readonly value: ParticipationAudience;
  readonly onChange: (value: ParticipationAudience) => void;
}) => {
  const theme = useAppTheme();
  return (
    <FormSection title="Participation">
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="label">Who can participate?</AppText>
        <SegmentedControl
          label="Who can participate?"
          value={value}
          options={[
            { value: 'all_members', label: 'All members' },
            { value: 'officers_only', label: 'Officers only' },
          ]}
          onChange={onChange}
        />
        <AppText variant="caption" color="muted">
          {value === 'all_members'
            ? 'Every club member can submit a response or ballot.'
            : 'Only officers, vice presidents, presidents, and developers can participate.'}
        </AppText>
      </View>
    </FormSection>
  );
};
