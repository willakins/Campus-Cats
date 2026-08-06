import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Survey } from '../../core/domain';
import { useAppTheme } from '../../theme';
import { AppText, Card, StatusPill } from '../design';

export const SurveyItem = React.memo(function SurveyItem({ survey }: { readonly survey: Survey }) {
  const router = useRouter();
  const theme = useAppTheme();
  return (
    <Card
      accessibilityLabel={`Open survey: ${survey.title}`}
      accent={survey.anonymous ? theme.colors.info : theme.colors.gold}
      onPress={() =>
        router.push({ pathname: '/surveys/respond' as never, params: { id: survey.id } })
      }
    >
      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          <StatusPill
            tone={survey.anonymous ? 'info' : 'warning'}
            label={survey.anonymous ? 'Anonymous survey' : 'Named survey'}
            icon={survey.anonymous ? 'eye-off-outline' : 'person-outline'}
          />
          <StatusPill
            tone={survey.status === 'open' ? 'success' : 'neutral'}
            label={survey.status === 'open' ? 'Open' : 'Closed'}
          />
        </View>
        <AppText variant="cardTitle">{survey.title}</AppText>
        {survey.details ? (
          <AppText color="muted" numberOfLines={3}>{survey.details}</AppText>
        ) : null}
        <AppText color="muted" variant="caption">
          {survey.questions.length} {survey.questions.length === 1 ? 'question' : 'questions'}
        </AppText>
      </View>
    </Card>
  );
});
