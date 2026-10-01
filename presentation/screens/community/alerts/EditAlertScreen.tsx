import { useEffect, useState } from 'react';
import { Alert as NativeAlert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { RestrictedAccess } from '@/presentation/access';
import {
  AppHeader,
  ErrorState,
  FormSkeleton,
  Screen,
} from '@/presentation/ui';
import { FormScreen, useFormValidation } from '@/presentation/forms';
import { appModules } from '@/composition/appModules';
import { Alert, parseUser, roleAccessPolicies } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import { useAppToast } from '@/presentation/providers/AppToastProvider';
import {
  AlertForm,
  AlertFormData,
  AlertFormErrors,
  AlertFormSection,
  AlertRequiredField,
  firstAlertErrorField,
  validateAlertForm,
} from '@/presentation/screens/community/alerts/forms/AlertForm';
import { useAuth } from '@/presentation/providers/AuthProvider';

const EditAlert = () => {
  const router = useRouter();
  const { queueSuccessToast } = useAppToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [alert, setAlert] = useState<Alert>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>(
    [],
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [formData, setFormData] = useState<AlertFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });
  const validation = useFormValidation<
    AlertFormSection,
    AlertRequiredField,
    AlertFormErrors
  >({
    errors: validateAlertForm(formData),
    firstError: firstAlertErrorField,
    sectionForField: () => 'basics',
  });

  useEffect(() => {
    if (!id) {
      setLoadError('Missing alert ID');
      return;
    }
    let active = true;
    void Promise.all([
      appModules.alerts.get(id),
      appModules.alerts.media(id),
    ]).then(([alertResult, mediaResult]) => {
      if (!active) return;
      if (!alertResult.ok) {
        setLoadError(alertResult.error.message);
        return;
      }
      setAlert(alertResult.value);
      setFormData({
        title: alertResult.value.title,
        info: alertResult.value.info,
        authorAlias: alertResult.value.authorAlias,
      });
      if (mediaResult.ok) {
        setStoredAssets(mediaResult.value);
        setPhotos(mediaResult.value.map(({ url }) => url));
      } else setError(mediaResult.error.message);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const selectionFor = (uri: string) => {
    const stored = storedAssets.find((asset) => asset.url === uri);
    return stored ? storedMedia(stored.id) : localMedia(uri);
  };
  const save = async () => {
    if (!alert || busy) return;
    setError(undefined);
    if (!validation.validate()) return;
    setBusy(true);
    const result = await appModules.alerts.update(
      parseUser(user),
      alert.id,
      { ...formData, photos: photos.map(selectionFor) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    queueSuccessToast('Alert saved.');
    router.replace({
      pathname: '/community/alerts/[id]',
      params: { id: alert.id },
    });
  };
  const confirmDelete = () => {
    if (!alert || busy) return;
    NativeAlert.alert('Delete Alert', 'Delete this alert forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void appModules.alerts
            .remove(parseUser(user), alert.id)
            .then((result) => {
              setBusy(false);
              if (result.ok) {
                router.replace({
                  pathname: '/community',
                  params: { section: 'alerts' },
                });
              } else setError(result.error.message);
            });
        },
      },
    ]);
  };

  if (!alert && !loadError) {
    return (
      <Screen scroll>
        <AppHeader
          title="Edit alert"
          eyebrow="Campus Cats update"
          onBack={() => router.back()}
          action={
            <RestrictedAccess policy={roleAccessPolicies.manageAlerts} />
          }
        />
        <FormSkeleton label="Loading alert form" fields={3} />
      </Screen>
    );
  }
  if (!alert) {
    return (
      <Screen>
        <AppHeader
          title="Edit alert"
          onBack={() => router.back()}
          action={
            <RestrictedAccess policy={roleAccessPolicies.manageAlerts} />
          }
        />
        <ErrorState
          title="Could not load alert"
          message={loadError || 'Alert not found'}
        />
      </Screen>
    );
  }
  return (
    <FormScreen
      title="Edit alert"
      eyebrow="Campus Cats update"
      access={{ policy: roleAccessPolicies.manageAlerts, role: user.role }}
      saveLabel="Save Alert"
      savingLabel="Saving alert…"
      busy={busy}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
      onBack={() => router.back()}
      onSave={() => void save()}
      onDelete={confirmDelete}
      deleteLabel="Delete Alert"
    >
      <AlertForm
        formData={formData}
        setFormData={setFormData}
        photos={photos}
        setPhotos={setPhotos}
        errors={validation.errors}
        onSectionLayout={validation.onSectionLayout}
        onRequiredFieldLayout={validation.onRequiredFieldLayout}
      />
    </FormScreen>
  );
};

export default EditAlert;
