import React, { useCallback, useState } from 'react';

import { useFocusEffect, useRouter } from 'expo-router';

import { ErrorState, FormSkeleton, FormSection } from '@/components/design';
import { FormScreen, FormTextInput, PhotoField } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { MediaSelection, storedMedia } from '@/core/media';
import { parseUser } from '@/core/domain';
import { useAuth } from '@/providers';

const EditProfileScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<{
    readonly uri: string;
    readonly selection: MediaSelection;
  }>();
  const [loading, setLoading] = useState(true);
  const [loadReady, setLoadReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadReady(false);
      setError(undefined);
      setPhoto(undefined);
      void Promise.all([
        appModules.profiles.sync(actor),
        appModules.profiles.media(actor.id),
      ]).then(([profileResult, mediaResult]) => {
        if (!active) return;
        if (profileResult.ok) {
          setDisplayName(profileResult.value.displayName);
          setBio(profileResult.value.bio);
        } else setError(profileResult.error.message);
        if (profileResult.ok && mediaResult.ok) {
          const storedPhoto =
            mediaResult.value.find(
              ({ url }) => url === profileResult.value.profilePhotoUrl,
            ) ?? mediaResult.value[0];
          if (storedPhoto) {
            setPhoto({
              uri: storedPhoto.url,
              selection: storedMedia(storedPhoto.id),
            });
          } else setPhoto(undefined);
          setLoadReady(true);
        } else if (!mediaResult.ok) setError(mediaResult.error.message);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [actor.id]),
  );

  const save = async () => {
    if (busy) return;
    if (!loadReady) {
      setError('Reload the profile before saving changes.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await appModules.profiles.update(actor, {
      displayName,
      bio,
      photo: photo?.selection,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/profile/view-profile',
      params: { id: actor.id },
    });
  };

  return (
    <FormScreen
      title="Edit profile"
      eyebrow="Member profile"
      saveLabel="Save Profile"
      savingLabel="Saving profile…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void save()}
    >
      {loading ? (
        <FormSkeleton label="Loading profile editor" fields={2} />
      ) : !loadReady ? (
        <ErrorState
          title="Profile editor unavailable"
          message={error || 'Reload the profile before editing.'}
        />
      ) : (
        <>
          <FormSection title="Profile picture">
            <PhotoField
              photos={photo ? [photo.uri] : []}
              coverUri={photo?.uri}
              onAddPhoto={(uri) =>
                setPhoto({ uri, selection: { kind: 'local', localUri: uri } })
              }
              onRemovePhoto={() => setPhoto(undefined)}
            />
          </FormSection>
          <FormSection title="About you">
            <FormTextInput
              label="Display name"
              required
              value={displayName}
              maxLength={60}
              helper={`${displayName.trim().length}/60 characters`}
              placeholder="How other members will know you"
              onChangeText={setDisplayName}
            />
            <FormTextInput
              label="Bio"
              value={bio}
              maxLength={500}
              helper={`Optional · ${bio.trim().length}/500 characters`}
              placeholder="Tell the club a little about yourself"
              multiline
              onChangeText={setBio}
            />
          </FormSection>
        </>
      )}
    </FormScreen>
  );
};

export default EditProfileScreen;
