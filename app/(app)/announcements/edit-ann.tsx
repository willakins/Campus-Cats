import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { RestrictedAccess } from '@/components/access';
import {
  AppHeader,
  ErrorState,
  FormSkeleton,
  Screen,
} from '@/components/design';
import { FormScreen, useFormValidation } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { Announcement, parseUser, roleAccessPolicies } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import {
  AnnouncementForm,
  AnnouncementFormData,
  AnnouncementFormErrors,
  AnnouncementFormSection,
  AnnouncementRequiredField,
  firstAnnouncementErrorField,
  validateAnnouncementForm,
} from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';

const EditAnnouncement = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>(
    [],
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });
  const validation = useFormValidation<
    AnnouncementFormSection,
    AnnouncementRequiredField,
    AnnouncementFormErrors
  >({
    errors: validateAnnouncementForm(formData),
    firstError: firstAnnouncementErrorField,
    sectionForField: () => 'basics',
  });

  useEffect(() => {
    if (!id) {
      setLoadError('Missing announcement ID');
      return;
    }
    let active = true;
    void Promise.all([
      appModules.announcements.get(id),
      appModules.announcements.media(id),
    ]).then(([announcementResult, mediaResult]) => {
      if (!active) return;
      if (!announcementResult.ok) {
        setLoadError(announcementResult.error.message);
        return;
      }
      setAnnouncement(announcementResult.value);
      setFormData({
        title: announcementResult.value.title,
        info: announcementResult.value.info,
        authorAlias: announcementResult.value.authorAlias,
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
    if (!announcement || busy) return;
    setError(undefined);
    if (!validation.validate()) return;
    setBusy(true);
    const result = await appModules.announcements.update(
      parseUser(user),
      announcement.id,
      { ...formData, photos: photos.map(selectionFor) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/announcements/view-ann',
      params: { id: announcement.id },
    });
  };
  const confirmDelete = () => {
    if (!announcement || busy) return;
    Alert.alert('Delete Announcement', 'Delete this announcement forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void appModules.announcements
            .remove(parseUser(user), announcement.id)
            .then((result) => {
              setBusy(false);
              if (result.ok) {
                router.replace({
                  pathname: '/announcements',
                  params: { section: 'announcements' },
                });
              } else setError(result.error.message);
            });
        },
      },
    ]);
  };

  if (!announcement && !loadError) {
    return (
      <Screen scroll>
        <AppHeader
          title="Edit announcement"
          eyebrow="Campus Cats update"
          onBack={() => router.back()}
          action={
            <RestrictedAccess policy={roleAccessPolicies.manageAnnouncements} />
          }
        />
        <FormSkeleton label="Loading announcement form" fields={3} />
      </Screen>
    );
  }
  if (!announcement) {
    return (
      <Screen>
        <AppHeader
          title="Edit announcement"
          onBack={() => router.back()}
          action={
            <RestrictedAccess policy={roleAccessPolicies.manageAnnouncements} />
          }
        />
        <ErrorState
          title="Could not load announcement"
          message={loadError || 'Announcement not found'}
        />
      </Screen>
    );
  }
  return (
    <FormScreen
      title="Edit announcement"
      eyebrow="Campus Cats update"
      access={{ policy: roleAccessPolicies.manageAnnouncements, role: user.role }}
      saveLabel="Save Announcement"
      savingLabel="Saving announcement…"
      busy={busy}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
      onBack={() => router.back()}
      onSave={() => void save()}
      onDelete={confirmDelete}
      deleteLabel="Delete Announcement"
    >
      <AnnouncementForm
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

export default EditAnnouncement;
