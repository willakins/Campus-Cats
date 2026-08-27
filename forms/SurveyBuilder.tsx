import React from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  FormSection,
  SegmentedControl,
} from '../components/design';
import { FormTextInput, ToggleField } from '../components/forms';
import { SurveyQuestionType } from '../core/domain';
import { useAppTheme } from '../theme';

export interface SurveyQuestionFormData {
  readonly key: string;
  readonly type: SurveyQuestionType;
  readonly prompt: string;
  readonly options: readonly string[];
}

export interface SurveyFormData {
  readonly title: string;
  readonly details: string;
  readonly anonymous: boolean;
  readonly questions: readonly SurveyQuestionFormData[];
}

export type SurveyRequiredField =
  'title' | 'questions' | `question:${string}` | `option:${string}:${number}`;
export type SurveyFormSection =
  | 'details'
  | 'questions'
  | `question:${string}`;
export type SurveyFormErrors = Partial<Record<SurveyRequiredField, string>>;

export const surveyQuestionField = (key: string): SurveyRequiredField =>
  `question:${key}`;
export const surveyOptionField = (
  key: string,
  optionIndex: number,
): SurveyRequiredField => `option:${key}:${optionIndex}`;

export const validateSurveyForm = (value: SurveyFormData): SurveyFormErrors => {
  const errors: SurveyFormErrors = {};
  if (!value.title.trim()) errors.title = 'Survey title is required.';
  if (value.questions.length === 0) {
    errors.questions = 'At least one question is required.';
  }
  value.questions.forEach((question, questionIndex) => {
    if (!question.prompt.trim()) {
      errors[surveyQuestionField(question.key)] =
        `Question ${questionIndex + 1} is required.`;
    }
    if (isChoice(question.type)) {
      question.options.forEach((option, optionIndex) => {
        if (!option.trim()) {
          errors[surveyOptionField(question.key, optionIndex)] =
            `Option ${optionIndex + 1} is required.`;
        }
      });
    }
  });
  return errors;
};

export const firstSurveyErrorField = (
  value: SurveyFormData,
  errors: SurveyFormErrors,
): SurveyRequiredField | undefined => {
  if (errors.title) return 'title';
  if (errors.questions) return 'questions';
  for (const question of value.questions) {
    const prompt = surveyQuestionField(question.key);
    if (errors[prompt]) return prompt;
    for (let index = 0; index < question.options.length; index += 1) {
      const option = surveyOptionField(question.key, index);
      if (errors[option]) return option;
    }
  }
  return undefined;
};

export const surveySectionForField = (
  field: SurveyRequiredField,
): SurveyFormSection => {
  if (field === 'title') return 'details';
  if (field === 'questions') return 'questions';
  const parts = field.split(':');
  return `question:${parts[1]}`;
};

const questionTypes = [
  { value: 'single_choice' as const, label: 'Multiple choice' },
  { value: 'multi_select' as const, label: 'Select all' },
  { value: 'long_text' as const, label: 'Free response' },
];

const isChoice = (type: SurveyQuestionType) =>
  type === 'single_choice' || type === 'multi_select';

export const SurveyBuilder = ({
  value,
  onChange,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}: {
  readonly value: SurveyFormData;
  readonly onChange: React.Dispatch<React.SetStateAction<SurveyFormData>>;
  readonly errors?: SurveyFormErrors;
  readonly onSectionLayout?: (section: SurveyFormSection, y: number) => void;
  readonly onRequiredFieldLayout?: (
    field: SurveyRequiredField,
    section: SurveyFormSection,
    y: number,
  ) => void;
}) => {
  const theme = useAppTheme();
  const changeQuestion = (
    key: string,
    update: (question: SurveyQuestionFormData) => SurveyQuestionFormData,
  ) =>
    onChange((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.key === key ? update(question) : question,
      ),
    }));
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= value.questions.length) return;
    onChange((current) => {
      const questions = [...current.questions];
      [questions[index], questions[destination]] = [
        questions[destination],
        questions[index],
      ];
      return { ...current, questions };
    });
  };

  return (
    <>
      <FormSection
        title="Survey details"
        testID="survey-section-details"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('details', nativeEvent.layout.y)
        }
      >
        <View
          testID="survey-field-title"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('title', 'details', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Title"
            required
            error={errors.title}
            value={value.title}
            maxLength={120}
            placeholder="Survey title"
            onChangeText={(title) =>
              onChange((current) => ({ ...current, title }))
            }
          />
        </View>
        <FormTextInput
          label="Description"
          value={value.details}
          maxLength={5000}
          multiline
          placeholder="Why are you asking these questions?"
          onChangeText={(details) =>
            onChange((current) => ({ ...current, details }))
          }
        />
        <ToggleField
          label="Make responses anonymous"
          value={value.anonymous}
          onValueChange={(anonymous) =>
            onChange((current) => ({ ...current, anonymous }))
          }
        />
      </FormSection>

      {value.questions.map((question, questionIndex) => {
        const section = `question:${question.key}` as const;
        const questionField = surveyQuestionField(question.key);
        return (
          <FormSection
            key={question.key}
            title={`Question ${questionIndex + 1}`}
            onLayout={({ nativeEvent }) =>
              onSectionLayout?.(section, nativeEvent.layout.y)
            }
          >
            <SegmentedControl
              label={`Question ${questionIndex + 1} type`}
              value={question.type}
              options={questionTypes}
              onChange={(type) =>
                changeQuestion(question.key, (current) => ({
                  ...current,
                  type,
                  options: isChoice(type)
                    ? current.options.length >= 2
                      ? current.options
                      : ['', '']
                    : [],
                }))
              }
            />
            <View
              onLayout={({ nativeEvent }) =>
                onRequiredFieldLayout?.(
                  questionField,
                  section,
                  nativeEvent.layout.y,
                )
              }
            >
              <FormTextInput
                label="Question"
                required
                error={errors[questionField]}
                value={question.prompt}
                maxLength={500}
                multiline
                onChangeText={(prompt) =>
                  changeQuestion(question.key, (current) => ({
                    ...current,
                    prompt,
                  }))
                }
              />
            </View>
            {isChoice(question.type) ? (
              <View style={{ gap: theme.spacing.sm }}>
                {question.options.map((option, optionIndex) => {
                  const optionField = surveyOptionField(
                    question.key,
                    optionIndex,
                  );
                  return (
                    <View
                      key={`${question.key}-option-${optionIndex}`}
                      onLayout={({ nativeEvent }) =>
                        onRequiredFieldLayout?.(
                          optionField,
                          section,
                          nativeEvent.layout.y,
                        )
                      }
                      style={{ gap: theme.spacing.xs }}
                    >
                      <FormTextInput
                        label={`Option ${optionIndex + 1}`}
                        required
                        error={errors[optionField]}
                        value={option}
                        maxLength={300}
                        onChangeText={(nextOption) =>
                          changeQuestion(question.key, (current) => ({
                            ...current,
                            options: current.options.map((item, index) =>
                              index === optionIndex ? nextOption : item,
                            ),
                          }))
                        }
                      />
                      {question.options.length > 2 ? (
                        <Button
                          label={`Remove option ${optionIndex + 1}`}
                          variant="tertiary"
                          size="small"
                          onPress={() =>
                            changeQuestion(question.key, (current) => ({
                              ...current,
                              options: current.options.filter(
                                (_, index) => index !== optionIndex,
                              ),
                            }))
                          }
                        />
                      ) : null}
                    </View>
                  );
                })}
                <Button
                  label="Add option"
                  icon="add-outline"
                  variant="secondary"
                  onPress={() =>
                    changeQuestion(question.key, (current) => ({
                      ...current,
                      options: [...current.options, ''],
                    }))
                  }
                />
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.xs,
              }}
            >
              <Button
                label="Move up"
                icon="arrow-up-outline"
                size="small"
                variant="secondary"
                disabled={questionIndex === 0}
                onPress={() => move(questionIndex, -1)}
              />
              <Button
                label="Move down"
                icon="arrow-down-outline"
                size="small"
                variant="secondary"
                disabled={questionIndex === value.questions.length - 1}
                onPress={() => move(questionIndex, 1)}
              />
              <Button
                label="Remove question"
                icon="trash-outline"
                size="small"
                variant="danger"
                onPress={() =>
                  onChange((current) => ({
                    ...current,
                    questions: current.questions.filter(
                      ({ key }) => key !== question.key,
                    ),
                  }))
                }
              />
            </View>
          </FormSection>
        );
      })}

      <View
        testID="survey-section-questions"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('questions', nativeEvent.layout.y)
        }
      >
        <View
          testID="survey-field-questions"
          accessibilityLabel="Survey questions field"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.(
              'questions',
              'questions',
              nativeEvent.layout.y,
            )
          }
          style={{
            gap: theme.spacing.sm,
            borderColor: theme.colors.danger,
            borderWidth: errors.questions ? 2 : 0,
            borderRadius: theme.radii.field,
            padding: errors.questions ? theme.spacing.sm : 0,
          }}
        >
          {errors.questions ? (
            <AppText color="danger" accessibilityLiveRegion="polite">
              {errors.questions}
            </AppText>
          ) : null}
          <Button
            label="Add question"
            icon="add-outline"
            variant="secondary"
            fullWidth
            onPress={() =>
              onChange((current) => ({
                ...current,
                questions: [
                  ...current.questions,
                  {
                    key: `question-${Date.now()}-${current.questions.length}`,
                    type: 'single_choice',
                    prompt: '',
                    options: ['', ''],
                  },
                ],
              }))
            }
          />
        </View>
      </View>
    </>
  );
};
