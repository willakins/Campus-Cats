import { useState } from 'react';

import { useRouter } from 'expo-router';

import { SurveyPrivacyBanner } from '@/components/community';
import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { SurveyBuilder, SurveyFormData } from '@/forms/SurveyBuilder';
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
  const [error, setError] = useState<string>();

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.surveys.create(actor, {
      ...formData,
      questions: formData.questions.map(({ key: _key, ...question }) => question),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/surveys/respond' as never,
      params: { id: result.value.id },
    });
  };

  return (
    <FormScreen
      title="Create survey"
      eyebrow="Community survey"
      saveLabel="Publish Survey"
      savingLabel="Publishing survey…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void create()}
    >
      <SurveyPrivacyBanner anonymous={formData.anonymous} />
      <SurveyBuilder value={formData} onChange={setFormData} />
    </FormScreen>
  );
};

export default CreateSurvey;
