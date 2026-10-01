import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import {
  ParticipationAlertOption,
  ParticipationAudienceOption,
} from '@/presentation/screens/community/components';
import { FormScreen } from '@/presentation/forms';
import { appModules } from '@/composition/appModules';
import {
  parseUser,
  ParticipationAudience,
  roleAccessPolicies,
} from '@/core/domain';
import { participationAlertDraft } from '@/features/alerts';
import {
  firstSurveyErrorField,
  SurveyForm,
  SurveyFormData,
  SurveyFormErrors,
  SurveyFormSection,
  SurveyRequiredField,
  surveySectionForField,
  validateSurveyForm,
} from '@/presentation/screens/community/surveys/forms/SurveyForm';
import { useAuth } from '@/presentation/providers';

const CreateSurvey = () => {
  const router = useRouter();
  const actor = parseUser(useAuth().user);
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    details: '',
    anonymous: true,
    questions: [
      {
        key: 'question-1',
        type: 'single_choice',
        prompt: '',
        options: ['', ''],
      },
    ],
  });
  const [busy, setBusy] = useState(false);
  const [participationAudience, setParticipationAudience] =
    useState<ParticipationAudience>('all_members');
  const [createAlert, setCreateAlert] = useState(false);
  const [error, setError] = useState<string>();
  const [validationErrors, setValidationErrors] = useState<SurveyFormErrors>(
    {},
  );
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<Partial<Record<SurveyFormSection, number>>>({});
  const fieldOffsets = useRef<
    Partial<
      Record<SurveyRequiredField, { section: SurveyFormSection; y: number }>
    >
  >({});

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(validateSurveyForm(formData));
  }, [formData]);

  const create = async () => {
    if (busy) return;
    setError(undefined);
    const nextErrors = validateSurveyForm(formData);
    const firstError = firstSurveyErrorField(formData, nextErrors);
    if (firstError) {
      const id = ++validationAttempt.current;
      setValidationErrors(nextErrors);
      setToast({ id, message: 'Please fill in the missing information.' });
      const fieldOffset = fieldOffsets.current[firstError];
      const section = fieldOffset?.section ?? surveySectionForField(firstError);
      setScrollRequest({
        id,
        y: (sectionOffsets.current[section] ?? 0) + (fieldOffset?.y ?? 0),
      });
      return;
    }
    setValidationErrors({});
    setBusy(true);
    const result = await appModules.surveys.create(actor, {
      ...formData,
      participationAudience,
      questions: formData.questions.map(
        ({ key: _key, ...question }) => question,
      ),
    });
    if (!result.ok) {
      setBusy(false);
      setError(result.error.message);
      return;
    }
    if (createAlert) {
      const alertResult = await appModules.alerts.create(
        actor,
        participationAlertDraft('survey', result.value.title),
      );
      if (!alertResult.ok) {
        Alert.alert(
          'Survey created',
          'The survey was published, but its alert could not be created.',
        );
      } else if (alertResult.warnings.length > 0) {
        Alert.alert('Survey and alert created', alertResult.warnings[0].message);
      }
    }
    setBusy(false);
    router.replace({
      pathname: '/community/surveys/[id]' as never,
      params: { id: result.value.id },
    });
  };

  return (
    <FormScreen
      title="Create survey"
      eyebrow="Community survey"
      access={{ policy: roleAccessPolicies.manageSurveys, role: actor.role }}
      saveLabel="Publish Survey"
      savingLabel="Publishing survey…"
      busy={busy}
      error={error}
      scrollRequest={scrollRequest}
      toast={toast}
      onBack={() => router.back()}
      onSave={() => void create()}
    >
      <SurveyForm
        value={formData}
        onChange={setFormData}
        errors={validationErrors}
        onSectionLayout={(section, y) => {
          sectionOffsets.current[section] = y;
        }}
        onRequiredFieldLayout={(field, section, y) => {
          fieldOffsets.current[field] = { section, y };
        }}
      />
      <ParticipationAudienceOption
        value={participationAudience}
        onChange={setParticipationAudience}
      />
      <ParticipationAlertOption
        checked={createAlert}
        subject="survey"
        onChange={setCreateAlert}
      />
    </FormScreen>
  );
};

export default CreateSurvey;
