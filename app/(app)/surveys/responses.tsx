import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { SurveyPrivacyBanner } from '@/components/community';
import {
  AccessDeniedState,
  AppHeader,
  AppText,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  Screen,
  StatusPill,
} from '@/components/design';
import { appModules } from '@/composition/appModules';
import {
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponse,
  canManageFeature,
  parseUser,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const answerText = (question: SurveyQuestion, answer: SurveyAnswer): string => {
  if (Array.isArray(answer.value)) {
    const labels = answer.value.map(
      (id) => question.options.find((option) => option.id === id)?.label ?? id,
    );
    return labels.join(', ');
  }
  if (question.type === 'single_choice') {
    return question.options.find((option) => option.id === answer.value)?.label ?? answer.value;
  }
  return answer.value;
};

const SurveyResponses = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const actor = parseUser(useAuth().user);
  const theme = useAppTheme();
  const authorized = canManageFeature(actor.role);
  const [survey, setSurvey] = useState<Survey>();
  const [responses, setResponses] = useState<readonly SurveyResponse[]>([]);
  const [loading, setLoading] = useState(authorized);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  const load = useCallback(async () => {
    if (!authorized || !id) {
      if (!id) setError('Missing survey ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    setWarning(undefined);
    const [surveyResult, responsesResult] = await Promise.all([
      appModules.surveys.get(actor, id),
      appModules.surveys.responses(actor, id),
    ]);
    if (surveyResult.ok) setSurvey(surveyResult.value);
    else setError(surveyResult.error.message);
    if (responsesResult.ok) {
      setResponses(responsesResult.value);
      setWarning(responsesResult.warnings[0]?.message);
    }
    else setError(responsesResult.error.message);
    setLoading(false);
  }, [actor.id, actor.role, authorized, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const questionById = useMemo(
    () => new Map(survey?.questions.map((question) => [question.id, question]) ?? []),
    [survey],
  );

  const close = async () => {
    if (!survey || closing) return;
    setClosing(true);
    setError(undefined);
    const result = await appModules.surveys.close(actor, survey.id);
    setClosing(false);
    if (result.ok) setSurvey(result.value);
    else setError(result.error.message);
  };

  return (
    <Screen scroll>
      <AppHeader title="Survey responses" eyebrow="Officer tools" onBack={() => router.back()} />
      {!authorized ? (
        <AccessDeniedState message="Only officers may view survey responses." />
      ) : loading ? (
        <CardListSkeleton label="Loading survey responses" />
      ) : survey ? (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.xs }}>
            <StatusPill
              tone={survey.status === 'open' ? 'success' : 'neutral'}
              label={survey.status === 'open' ? 'Open survey' : 'Closed survey'}
            />
            <AppText variant="pageTitle">{survey.title}</AppText>
            <AppText color="muted">
              {responses.length} {responses.length === 1 ? 'response' : 'responses'}
            </AppText>
          </View>
          <SurveyPrivacyBanner anonymous={survey.anonymous} />
          {warning ? <FeedbackBanner message={warning} tone="warning" /> : null}
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          {survey.status === 'open' ? (
            <Button
              label="Close Survey"
              icon="lock-closed-outline"
              variant="secondary"
              loading={closing}
              onPress={() => void close()}
            />
          ) : null}
          {responses.length === 0 ? (
            <EmptyState title="No responses yet" message="Submitted responses will appear here." />
          ) : (
            responses.map((response, responseIndex) => (
              <Card key={response.id} accent={theme.colors.info}>
                <View style={{ gap: theme.spacing.md }}>
                  <View style={{ gap: theme.spacing.xxs }}>
                    <AppText variant="cardTitle">
                      {response.respondent
                        ? response.respondent.email
                        : `Anonymous response ${responses.length - responseIndex}`}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {response.submittedAt.toLocaleString()}
                    </AppText>
                  </View>
                  {response.answers.map((answer, answerIndex) => {
                    const question = questionById.get(answer.questionId);
                    return question ? (
                      <View key={answer.questionId} style={{ gap: theme.spacing.xxs }}>
                        <AppText variant="label">{answerIndex + 1}. {question.prompt}</AppText>
                        <AppText>{answerText(question, answer)}</AppText>
                      </View>
                    ) : null;
                  })}
                </View>
              </Card>
            ))
          )}
        </View>
      ) : (
        <ErrorState title="Responses unavailable" message={error || 'Survey not found'} />
      )}
    </Screen>
  );
};

export default SurveyResponses;
