import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { SurveyPrivacyBanner } from '@/components/community';
import {
  AppHeader,
  AppText,
  Button,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormSection,
  Screen,
  StatusPill,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  Survey,
  SurveyAnswer,
  SurveyOption,
  SurveyQuestion,
  canAccessRolePolicy,
  canParticipate,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type AnswerValue = string | SurveyOption['id'][];

const ChoiceOption = ({
  question,
  label,
  selected,
  onPress,
}: {
  readonly question: SurveyQuestion;
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) => {
  const theme = useAppTheme();
  const multiple = question.type === 'multi_select';
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.radii.field,
        backgroundColor: selected ? theme.colors.primarySurface : theme.colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: multiple ? theme.radii.field / 2 : 11,
          borderWidth: 2,
          borderColor: theme.colors.primary,
          backgroundColor: selected ? theme.colors.primary : 'transparent',
        }}
      />
      <AppText style={{ flex: 1 }}>{label}</AppText>
    </Pressable>
  );
};

const RespondToSurvey = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const actor = parseUser(useAuth().user);
  const theme = useAppTheme();
  const isOfficer = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.viewSurveyResponses,
  );
  const [survey, setSurvey] = useState<Survey>();
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const eligible = survey
    ? canParticipate(actor.role, survey.participationAudience)
    : false;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      if (!id) {
        setError('Missing survey ID');
        setLoading(false);
        return () => { active = false; };
      }
      void Promise.all([
        appModules.surveys.get(actor, id),
        appModules.surveys.hasSubmitted(actor, id),
      ]).then(([surveyResult, submittedResult]) => {
        if (!active) return;
        if (surveyResult.ok) setSurvey(surveyResult.value);
        else setError(surveyResult.error.message);
        if (submittedResult.ok) setSubmitted(submittedResult.value);
        else setError(submittedResult.error.message);
        setLoading(false);
      });
      return () => { active = false; };
    }, [actor.id, actor.role, id]),
  );

  const toggle = (question: SurveyQuestion, optionId: SurveyOption['id']) => {
    setAnswers((current) => {
      if (question.type === 'single_choice') {
        return { ...current, [question.id]: optionId };
      }
      const selected = Array.isArray(current[question.id])
        ? current[question.id] as SurveyOption['id'][]
        : [];
      return {
        ...current,
        [question.id]: selected.includes(optionId)
          ? selected.filter((value) => value !== optionId)
          : [...selected, optionId],
      };
    });
  };

  const submit = async () => {
    if (!survey || busy) return;
    setBusy(true);
    setError(undefined);
    const responseAnswers: SurveyAnswer[] = survey.questions.map((question) => ({
      questionId: question.id,
      value: answers[question.id] ??
        (question.type === 'multi_select' ? [] : ''),
    }));
    const result = await appModules.surveys.submit(actor, survey.id, responseAnswers);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <Screen
      scroll
      keyboardAware
      footer={survey && survey.status === 'open' && eligible && !submitted ? (
        <Button
          label={survey.anonymous ? 'Submit Anonymous Response' : 'Submit Response With My Name'}
          fullWidth
          loading={busy}
          loadingLabel="Submitting response…"
          onPress={() => void submit()}
        />
      ) : undefined}
    >
      <AppHeader
        title="Survey"
        eyebrow="Community"
        onBack={() => router.back()}
        action={survey && isOfficer ? (
          <Button
            label="Responses"
            size="small"
            variant="secondary"
            onPress={() => router.push({ pathname: '/surveys/responses' as never, params: { id: survey.id } })}
          />
        ) : undefined}
      />
      {loading ? (
        <DetailSkeleton label="Loading survey" />
      ) : survey ? (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.xs }}>
            <StatusPill
              tone={survey.status === 'open' ? 'success' : 'neutral'}
              label={survey.status === 'open' ? 'Open survey' : 'Closed survey'}
            />
            <AppText variant="pageTitle">{survey.title}</AppText>
            {survey.details ? <AppText color="muted">{survey.details}</AppText> : null}
          </View>
          <SurveyPrivacyBanner anonymous={survey.anonymous} />
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          {submitted ? (
            <EmptyState
              title="Response submitted"
              message={survey.anonymous ? 'Your anonymous answers have been recorded.' : 'Your named answers have been recorded.'}
            />
          ) : survey.status === 'closed' ? (
            <EmptyState title="This survey is closed" message="Past responses remain available to officers." />
          ) : !eligible ? (
            <EmptyState
              title="Officer participation only"
              message="Only officers can submit this survey."
            />
          ) : (
            survey.questions.map((question, index) => (
              <FormSection key={question.id} title={`${index + 1}. ${question.prompt}`}>
                {question.type === 'single_choice' || question.type === 'multi_select' ? (
                  <View style={{ gap: theme.spacing.sm }}>
                    {question.options.map((option) => {
                      const value = answers[question.id];
                      const selected = Array.isArray(value)
                        ? value.includes(option.id)
                        : value === option.id;
                      return (
                        <ChoiceOption
                          key={option.id}
                          question={question}
                          label={option.label}
                          selected={selected}
                          onPress={() => toggle(question, option.id)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <FormTextInput
                    label="Free response"
                    required
                    value={typeof answers[question.id] === 'string' ? answers[question.id] as string : ''}
                    maxLength={question.type === 'short_text' ? 500 : 5000}
                    multiline
                    onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                  />
                )}
              </FormSection>
            ))
          )}
        </View>
      ) : (
        <ErrorState title="Survey unavailable" message={error || 'Survey not found'} />
      )}
    </Screen>
  );
};

export default RespondToSurvey;
