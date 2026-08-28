import { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItemInfo, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { SurveyPrivacyBanner } from '@/components/community';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { useFocusTask } from '@/components/hooks/useFocusTask';
import {
  AppText,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  StatusPill,
} from '@/components/design';
import { RestrictedScreen } from '@/components/access';
import { appModules } from '@/composition/appModules';
import {
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponse,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
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
  const authorized = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.viewSurveyResponses,
  );
  const [survey, setSurvey] = useState<Survey>();
  const [responses, setResponses] = useState<readonly SurveyResponse[]>([]);
  const [loading, setLoading] = useState(authorized);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  const load = useCallback(async (isActive: () => boolean = () => true) => {
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
    if (!isActive()) return;
    if (surveyResult.ok) setSurvey(surveyResult.value);
    else setError(surveyResult.error.message);
    if (responsesResult.ok) {
      setResponses(responsesResult.value);
      setWarning(responsesResult.warnings[0]?.message);
    }
    else setError(responsesResult.error.message);
    setLoading(false);
  }, [actor.id, actor.role, authorized, id]);

  useFocusTask(load);

  const questionById = useMemo(
    () => new Map(survey?.questions.map((question) => [question.id, question]) ?? []),
    [survey],
  );
  const renderResponse = useCallback(
    ({ item, index }: ListRenderItemInfo<SurveyResponse>) => (
      <SurveyResponseCard
        response={item}
        responseIndex={index}
        responseCount={responses.length}
        questionById={questionById}
      />
    ),
    [questionById, responses.length],
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
    <RestrictedScreen
      title="Survey responses"
      eyebrow="Officer tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.viewSurveyResponses, role: actor.role }}
    >
      {loading ? (
        <CardListSkeleton label="Loading survey responses" />
      ) : survey ? (
        <FlatList
          {...virtualizedListPerformanceProps}
          testID="survey-response-list"
          data={responses}
          keyExtractor={(response) => response.id}
          renderItem={renderResponse}
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
          ListHeaderComponent={(
            <View style={{ gap: theme.spacing.lg }}>
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
            </View>
          )}
          ListEmptyComponent={(
            <EmptyState title="No responses yet" message="Submitted responses will appear here." />
          )}
        />
      ) : (
        <ErrorState title="Responses unavailable" message={error || 'Survey not found'} />
      )}
    </RestrictedScreen>
  );
};

const SurveyResponseCard = ({
  response,
  responseIndex,
  responseCount,
  questionById,
}: {
  readonly response: SurveyResponse;
  readonly responseIndex: number;
  readonly responseCount: number;
  readonly questionById: ReadonlyMap<string, SurveyQuestion>;
}) => {
  const theme = useAppTheme();
  return (
    <Card accent={theme.colors.info}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="cardTitle">
            {response.respondent
              ? response.respondent.email
              : `Anonymous response ${responseCount - responseIndex}`}
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
  );
};

export default SurveyResponses;
