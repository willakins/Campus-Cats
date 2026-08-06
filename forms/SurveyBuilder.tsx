import React from 'react';
import { View } from 'react-native';

import { Button, FormSection, SegmentedControl } from '../components/design';
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

const questionTypes = [
  { value: 'single_choice' as const, label: 'Multiple choice' },
  { value: 'multi_select' as const, label: 'Select all' },
  { value: 'short_text' as const, label: 'Short answer' },
  { value: 'long_text' as const, label: 'Long answer' },
];

const isChoice = (type: SurveyQuestionType) =>
  type === 'single_choice' || type === 'multi_select';

export const SurveyBuilder = ({
  value,
  onChange,
}: {
  readonly value: SurveyFormData;
  readonly onChange: React.Dispatch<React.SetStateAction<SurveyFormData>>;
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
      <FormSection title="Survey details">
        <FormTextInput
          label="Title"
          required
          value={value.title}
          maxLength={120}
          placeholder="Survey title"
          onChangeText={(title) => onChange((current) => ({ ...current, title }))}
        />
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

      {value.questions.map((question, questionIndex) => (
        <FormSection key={question.key} title={`Question ${questionIndex + 1}`}>
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
          <FormTextInput
            label="Question"
            required
            value={question.prompt}
            maxLength={500}
            multiline
            onChangeText={(prompt) =>
              changeQuestion(question.key, (current) => ({ ...current, prompt }))
            }
          />
          {isChoice(question.type) ? (
            <View style={{ gap: theme.spacing.sm }}>
              {question.options.map((option, optionIndex) => (
                <View key={`${question.key}-option-${optionIndex}`} style={{ gap: theme.spacing.xs }}>
                  <FormTextInput
                    label={`Option ${optionIndex + 1}`}
                    required
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
                          options: current.options.filter((_, index) => index !== optionIndex),
                        }))
                      }
                    />
                  ) : null}
                </View>
              ))}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
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
                  questions: current.questions.filter(({ key }) => key !== question.key),
                }))
              }
            />
          </View>
        </FormSection>
      ))}

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
    </>
  );
};
