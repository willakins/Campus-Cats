import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import {
  ParticipationAnnouncementOption,
  ParticipationAudienceOption,
} from '@/components/community';
import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  parseUser,
  ParticipationAudience,
  roleAccessPolicies,
} from '@/core/domain';
import { participationAnnouncementDraft } from '@/features/announcements';
import {
  firstSurveyErrorField,
  SurveyBuilder,
  SurveyFormData,
  SurveyFormErrors,
  SurveyFormSection,
  SurveyRequiredField,
  surveySectionForField,
  validateSurveyForm,
} from '@/forms/SurveyBuilder';
import { useAuth } from '@/providers';

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
  const [createAnnouncement, setCreateAnnouncement] = useState(false);
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
    if (createAnnouncement) {
      const announcementResult = await appModules.announcements.create(
        actor,
        participationAnnouncementDraft('survey', result.value.title),
      );
      if (!announcementResult.ok) {
        Alert.alert(
          'Survey created',
          'The survey was published, but its announcement could not be created.',
        );
      } else if (announcementResult.warnings.length > 0) {
        Alert.alert('Survey and announcement created', announcementResult.warnings[0].message);
      }
    }
    setBusy(false);
    router.replace({
      pathname: '/surveys/respond' as never,
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
      <SurveyBuilder
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
      <ParticipationAnnouncementOption
        checked={createAnnouncement}
        subject="survey"
        onChange={setCreateAnnouncement}
      />
    </FormScreen>
  );
};

export default CreateSurvey;
