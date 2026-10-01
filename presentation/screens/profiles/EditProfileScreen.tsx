import React, { useCallback, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AppText,
  Button,
  Card,
  ErrorState,
  FeedbackBanner,
  FormSkeleton,
  FormSection,
} from '@/presentation/ui';
import {
  FormScreen,
  FormTextInput,
  PhotoField,
  useFormValidation,
} from '@/presentation/forms';
import { FavoriteCatField, ProfileTitleField } from '@/presentation/screens/profiles/components';
import { appModules } from '@/composition/appModules';
import { MediaSelection, storedMedia } from '@/core/media';
import {
  ACHIEVEMENTS,
  AchievementId,
  CatalogRecord,
  Role,
  parseUser,
} from '@/core/domain';
import { useAppToast } from '@/presentation/providers/AppToastProvider';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

type ProfileFormField = 'displayName' | 'bio';
type ProfileFormSection = 'about';
type ProfileFormErrors = Partial<Record<ProfileFormField, string>>;

const validateProfileForm = ({
  displayName,
  bio,
}: {
  displayName: string;
  bio: string;
}): ProfileFormErrors => {
  const errors: ProfileFormErrors = {};
  if (!displayName.trim()) {
    errors.displayName = 'Display name is required.';
  } else if (displayName.trim().length > 60) {
    errors.displayName = 'Display name must be 60 characters or fewer.';
  }
  if (bio.trim().length > 500) {
    errors.bio = 'Bio must be 500 characters or fewer.';
  }
  return errors;
};

const firstProfileErrorField = (
  errors: ProfileFormErrors,
): ProfileFormField | undefined =>
  (['displayName', 'bio'] as const).find((field) => errors[field]);

const profileSectionForField = (): ProfileFormSection => 'about';

const partialSaveMessage = (
  savedChanges: readonly string[],
  errorMessage: string,
) =>
  savedChanges.length > 0
    ? `${savedChanges.join(' and ')} saved, but ${errorMessage.toLocaleLowerCase()}`
    : errorMessage;

const EditProfileScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { queueSuccessToast } = useAppToast();
  const { signOut, user } = useAuth();
  const actor = parseUser(user);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedTitleId, setSelectedTitleId] = useState<AchievementId | ''>(
    '',
  );
  const [initialTitleId, setInitialTitleId] = useState<AchievementId | ''>('');
  const [unlockedTitleIds, setUnlockedTitleIds] = useState<
    readonly AchievementId[]
  >([]);
  const [favoriteCatalogId, setFavoriteCatalogId] = useState('');
  const [initialFavoriteCatalogId, setInitialFavoriteCatalogId] = useState('');
  const [catalogEntries, setCatalogEntries] = useState<
    readonly CatalogRecord[]
  >([]);
  const [favoriteAvailable, setFavoriteAvailable] = useState(false);
  const [photo, setPhoto] = useState<{
    readonly uri: string;
    readonly selection: MediaSelection;
  }>();
  const [loading, setLoading] = useState(true);
  const [loadReady, setLoadReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const validation = useFormValidation<
    ProfileFormSection,
    ProfileFormField,
    ProfileFormErrors
  >({
    errors: validateProfileForm({ displayName, bio }),
    firstError: firstProfileErrorField,
    sectionForField: profileSectionForField,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadReady(false);
      setError(undefined);
      setPhoto(undefined);
      setFavoriteAvailable(false);
      setFavoriteCatalogId('');
      setInitialFavoriteCatalogId('');
      setCatalogEntries([]);
      void Promise.all([
        appModules.profiles.sync(actor),
        appModules.profiles.media(actor.id),
        appModules.catalog.list(actor),
        appModules.catalog.favoriteForUser(actor.id),
      ]).then(([profileResult, mediaResult, catalogResult, favoriteResult]) => {
        if (!active) return;
        if (profileResult.ok) {
          setDisplayName(profileResult.value.displayName);
          setBio(profileResult.value.bio);
          setSelectedTitleId(profileResult.value.selectedTitleId);
          setInitialTitleId(profileResult.value.selectedTitleId);
          setUnlockedTitleIds(profileResult.value.achievementIds);
        } else setError(profileResult.error.message);
        if (catalogResult.ok) {
          setCatalogEntries(catalogResult.value);
        }
        if (favoriteResult.ok) {
          const favoriteId = favoriteResult.value?.catalogId ?? '';
          setFavoriteCatalogId(favoriteId);
          setInitialFavoriteCatalogId(favoriteId);
        }
        setFavoriteAvailable(catalogResult.ok && favoriteResult.ok);
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
    if (busy || deleting) return;
    if (!loadReady) {
      setError('Reload the profile before saving changes.');
      return;
    }
    setError(undefined);
    if (!validation.validate()) return;
    setBusy(true);
    const savedChanges: string[] = [];
    if (selectedTitleId !== initialTitleId) {
      const titleResult = await appModules.profiles.selectTitle(
        actor,
        selectedTitleId,
      );
      if (!titleResult.ok) {
        setBusy(false);
        setError(partialSaveMessage(savedChanges, titleResult.error.message));
        return;
      }
      setInitialTitleId(selectedTitleId);
      savedChanges.push('Displayed title');
    }
    if (favoriteAvailable && favoriteCatalogId !== initialFavoriteCatalogId) {
      const favoriteResult = await appModules.catalog.setFavorite(
        actor,
        favoriteCatalogId || undefined,
      );
      if (!favoriteResult.ok) {
        setBusy(false);
        setError(
          partialSaveMessage(savedChanges, favoriteResult.error.message),
        );
        return;
      }
      setInitialFavoriteCatalogId(favoriteCatalogId);
      savedChanges.push('Favorite cat');
    }
    const result = await appModules.profiles.update(actor, {
      displayName,
      bio,
      photo: photo?.selection,
    });
    if (!result.ok) {
      setBusy(false);
      setError(partialSaveMessage(savedChanges, result.error.message));
      return;
    }
    setBusy(false);
    queueSuccessToast('Profile saved.');
    router.replace({
      pathname: '/profiles/[id]',
      params: { id: actor.id },
    });
  };

  const confirmDeleteAccount = () => {
    if (busy || deleting) return;
    Alert.alert(
      'Permanently delete your account?',
      'This cannot be undone. Your account and personal contributions will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            setError(undefined);
            void appModules.users
              .deleteOwnAccount(actor, actor.email)
              .then(async (result) => {
                if (!result.ok) {
                  setError(result.error.message);
                  setDeleting(false);
                  return;
                }
                await signOut().catch(() => undefined);
                router.replace('/login');
              });
          },
        },
      ],
    );
  };

  return (
    <FormScreen
      title="Edit profile"
      eyebrow="Member profile"
      saveLabel="Save Profile"
      savingLabel="Saving profile…"
      busy={busy}
      saveDisabled={deleting}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
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
          <FormSection
            title="Profile"
            testID="profile-section-about"
            onLayout={({ nativeEvent }) => {
              validation.onSectionLayout('about', nativeEvent.layout.y);
            }}
          >
            <PhotoField
              photos={photo ? [photo.uri] : []}
              label="Profile photo"
              mode="single"
              presentation="avatar"
              crop="circle"
              hideLabel
              helper={
                Platform.OS === 'web'
                  ? 'Choose one photo to represent you across Campus Cats.'
                  : 'Choose a photo, then move and crop it to fit your profile circle.'
              }
              coverUri={photo?.uri}
              onAddPhoto={(uri) =>
                setPhoto({ uri, selection: { kind: 'local', localUri: uri } })
              }
              onRemovePhoto={() => setPhoto(undefined)}
            />
            <View
              testID="profile-field-display-name"
              onLayout={({ nativeEvent }) => {
                validation.onRequiredFieldLayout(
                  'displayName',
                  'about',
                  nativeEvent.layout.y,
                );
              }}
            >
              <FormTextInput
                label="Display name"
                required
                error={validation.errors.displayName}
                value={displayName}
                maxLength={60}
                helper={`${displayName.trim().length}/60 characters`}
                placeholder="How other members will know you"
                style={{ transform: [{ translateY: -5 }] }}
                onChangeText={setDisplayName}
              />
            </View>
            <View
              onLayout={({ nativeEvent }) => {
                validation.onRequiredFieldLayout(
                  'bio',
                  'about',
                  nativeEvent.layout.y,
                );
              }}
            >
              <FormTextInput
                label="Bio"
                error={validation.errors.bio}
                value={bio}
                maxLength={500}
                helper={`Optional · ${bio.trim().length}/500 characters`}
                placeholder="Tell the club a little about yourself"
                multiline
                onChangeText={setBio}
              />
            </View>
          </FormSection>
          <FormSection title="Profile favorites">
            {favoriteAvailable ? (
              <FavoriteCatField
                value={favoriteCatalogId}
                entries={catalogEntries}
                onChange={setFavoriteCatalogId}
              />
            ) : (
              <FeedbackBanner
                tone="warning"
                message="Favorite cat selection is unavailable right now. Your current favorite will not be changed."
              />
            )}
            <ProfileTitleField
              value={selectedTitleId}
              unlockedIds={unlockedTitleIds}
              onChange={setSelectedTitleId}
            />
            <AppText variant="caption" color="muted">
              {unlockedTitleIds.length} of {ACHIEVEMENTS.length} titles unlocked
            </AppText>
          </FormSection>
          <FormSection title="Danger zone">
            <Card
              accent={theme.colors.danger}
              style={{ gap: theme.spacing.sm }}
            >
              <AppText variant="cardTitle">
                Permanently delete your account
              </AppText>
              <AppText color="muted">
                This removes your sign-in, profile, photos, sightings, comments,
                chat, reactions, and account-linked survey and voting records.
                This cannot be undone.
              </AppText>
              {actor.role === Role.President ? (
                <FeedbackBanner
                  message="Transfer the club presidency before deleting this account."
                  tone="warning"
                />
              ) : (
                <Button
                  label="Delete my account"
                  variant="danger"
                  loading={deleting}
                  loadingLabel="Deleting account…"
                  disabled={busy || deleting}
                  onPress={confirmDeleteAccount}
                />
              )}
            </Card>
          </FormSection>
        </>
      )}
    </FormScreen>
  );
};

export default EditProfileScreen;
