import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { roleLabel } from '@/components/administration/rolePresentation';
import {
  AppHeader,
  AppText,
  Button,
  Card,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormSection,
  Screen,
  StatusPill,
} from '@/components/design';
import { ProfileAvatar, ProfileSightingItem } from '@/components/profile';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { appModules } from '@/composition/appModules';
import {
  ACHIEVEMENTS,
  AchievementId,
  CatalogRecord,
  SightingRecord,
  PublicProfile,
  achievementById,
  parseUser,
} from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ViewProfileScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const actor = parseUser(user);
  const targetId = id ?? actor.id;
  const isOwnProfile = targetId === actor.id;
  const [profile, setProfile] = useState<PublicProfile>();
  const [sightings, setSightings] = useState<readonly SightingRecord[]>([]);
  const [favorite, setFavorite] = useState<CatalogRecord>();
  const [favoritePhoto, setFavoritePhoto] = useState<DisplayMediaAsset>();
  const [loading, setLoading] = useState(true);
  const [titleBusy, setTitleBusy] = useState<AchievementId | ''>();
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setProfile(undefined);
      setSightings([]);
      setError(undefined);
      setWarning(undefined);
      setFavorite(undefined);
      setFavoritePhoto(undefined);

      const load = async () => {
        const [profileResult, sightingsResult, favoriteResult] =
          await Promise.all([
            isOwnProfile
              ? appModules.profiles.sync(actor)
              : appModules.profiles.getOrSync(targetId),
            appModules.sightings.listByReporter(actor, targetId),
            appModules.catalog.favoriteForUser(targetId),
          ]);
        if (!active) return;
        if (profileResult.ok) {
          setProfile(profileResult.value);
          if (profileResult.warnings.length > 0) {
            setWarning(
              profileResult.warnings.map(({ message }) => message).join(' '),
            );
          }
        }
        else setError(profileResult.error.message);
        if (sightingsResult.ok) {
          setSightings(sightingsResult.value);
        } else setWarning(sightingsResult.error.message);

        if (favoriteResult.ok && favoriteResult.value) {
          const [catalogResult, mediaResult] = await Promise.all([
            appModules.catalog.get(actor, favoriteResult.value.catalogId),
            appModules.catalog.media(favoriteResult.value.catalogId),
          ]);
          if (!active) return;
          if (catalogResult.ok) setFavorite(catalogResult.value);
          if (mediaResult.ok) {
            setFavoritePhoto(
              mediaResult.value.find(({ role }) => role === 'profile'),
            );
          }
        } else if (!favoriteResult.ok) {
          setWarning(favoriteResult.error.message);
        }
        setLoading(false);
      };
      void load();
      return () => {
        active = false;
      };
    }, [actor.id, isOwnProfile, targetId]),
  );

  const chooseTitle = async (achievementId: AchievementId | '') => {
    if (!isOwnProfile || titleBusy !== undefined) return;
    setTitleBusy(achievementId);
    setWarning(undefined);
    const result = await appModules.profiles.selectTitle(actor, achievementId);
    setTitleBusy(undefined);
    if (result.ok) setProfile(result.value);
    else setWarning(result.error.message);
  };

  const selectedTitle = profile
    ? achievementById(profile.selectedTitleId)?.title
    : undefined;

  return (
    <ScreenWithProfileFooter
      showEdit={Boolean(profile && isOwnProfile)}
      onEdit={() => router.push('/profile/edit-profile')}
    >
      <AppHeader
        title="Member profile"
        eyebrow="Campus Cats community"
        onBack={() => router.back()}
      />
      {warning ? <FeedbackBanner message={warning} tone="warning" /> : null}
      {loading ? (
        <DetailSkeleton label="Loading member profile" />
      ) : profile ? (
        <View style={{ gap: theme.spacing.lg }}>
          <Card accent={theme.colors.violet}>
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <ProfileAvatar
                displayName={profile.displayName}
                photoUrl={profile.profilePhotoUrl}
                size={128}
              />
              <AppText variant="pageTitle" style={{ textAlign: 'center' }}>
                {profile.displayName}
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <StatusPill
                  label={roleLabel(profile.role)}
                  tone={profile.role === 0 ? 'neutral' : 'primary'}
                  icon={profile.role === 0 ? 'person-outline' : 'shield-checkmark'}
                />
                {selectedTitle ? (
                  <StatusPill
                    label={selectedTitle}
                    tone="success"
                    icon="ribbon"
                  />
                ) : null}
              </View>
              {profile.bio ? (
                <AppText style={{ textAlign: 'center' }}>{profile.bio}</AppText>
              ) : isOwnProfile ? (
                <AppText color="muted" style={{ textAlign: 'center' }}>
                  Add a bio to tell other members about yourself.
                </AppText>
              ) : null}
            </View>
          </Card>

          <FormSection title="Favorite cat">
            {favorite ? (
              <Card
                accessibilityLabel={`View favorite cat ${favorite.cat.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/catalog/view-entry',
                    params: { id: favorite.id },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                  }}
                >
                  {favoritePhoto ? (
                    <ProgressiveImage
                      accessibilityLabel={`${favorite.cat.name} profile photo`}
                      uri={favoritePhoto.url}
                      resizeMode="cover"
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: theme.radii.field,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: theme.radii.field,
                        backgroundColor: theme.colors.goldSurface,
                      }}
                    >
                      <Ionicons name="heart" size={32} color={theme.colors.gold} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="primary">
                      Favorite cat
                    </AppText>
                    <AppText variant="cardTitle">{favorite.cat.name}</AppText>
                    <AppText color="muted" numberOfLines={2}>
                      {favorite.cat.descShort}
                    </AppText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </View>
              </Card>
            ) : (
              <EmptyState
                title="No favorite cat yet"
                message={
                  isOwnProfile
                    ? 'Heart one profile in the catalog to feature that cat here.'
                    : 'This member has not chosen a favorite cat.'
                }
                actionLabel={isOwnProfile ? 'Browse cats' : undefined}
                onAction={
                  isOwnProfile
                    ? () => router.push('/(app)/(tabs)/catalog')
                    : undefined
                }
              />
            )}
          </FormSection>

          <FormSection title="Achievements & titles">
            <AppText color="muted">
              {profile.achievementIds.length} of {ACHIEVEMENTS.length} achievements unlocked
            </AppText>
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = profile.achievementIds.includes(achievement.id);
              const selected = profile.selectedTitleId === achievement.id;
              return (
                <Card
                  key={achievement.id}
                  accent={unlocked ? theme.colors.gold : theme.colors.border}
                >
                  <View style={{ gap: theme.spacing.sm }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                      }}
                    >
                      <Ionicons
                        name={unlocked ? 'trophy' : 'lock-closed'}
                        size={26}
                        color={unlocked ? theme.colors.gold : theme.colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText variant="cardTitle">{achievement.name}</AppText>
                        <AppText color="muted">{achievement.description}</AppText>
                      </View>
                      <StatusPill
                        label={unlocked ? achievement.title : 'Locked'}
                        tone={selected ? 'success' : unlocked ? 'primary' : 'neutral'}
                        icon={selected ? 'checkmark-circle' : undefined}
                      />
                    </View>
                    {isOwnProfile && unlocked ? (
                      <Button
                        label={selected ? 'Remove displayed title' : `Display “${achievement.title}”`}
                        variant={selected ? 'secondary' : 'tertiary'}
                        size="small"
                        loading={titleBusy === achievement.id || (selected && titleBusy === '')}
                        onPress={() =>
                          void chooseTitle(selected ? '' : achievement.id)
                        }
                      />
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </FormSection>

          <FormSection title={`Previous sightings (${sightings.length})`}>
            {sightings.length ? (
              <>
                {sightings.slice(0, 3).map((sighting) => (
                  <ProfileSightingItem key={sighting.id} sighting={sighting} />
                ))}
                {sightings.length > 3 ? (
                  <Button
                    label={`View all ${sightings.length} sightings`}
                    variant="tertiary"
                    icon="list"
                    onPress={() =>
                      router.push({
                        pathname: '/profile/sightings',
                        params: {
                          id: profile.id,
                          displayName: profile.displayName,
                        },
                      })
                    }
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                title="No sightings yet"
                message={
                  isOwnProfile
                    ? 'Your Campus Cats field reports will appear here.'
                    : 'This member has not reported a sighting.'
                }
              />
            )}
          </FormSection>
        </View>
      ) : (
        <ErrorState
          title="Profile unavailable"
          message={error || 'Member profile not found'}
        />
      )}
    </ScreenWithProfileFooter>
  );
};

const ScreenWithProfileFooter = ({
  children,
  showEdit,
  onEdit,
}: {
  readonly children: React.ReactNode;
  readonly showEdit: boolean;
  readonly onEdit: () => void;
}) => {
  return (
    <Screen
      scroll
      footer={
        showEdit ? (
          <Button
            label="Edit profile"
            icon="create-outline"
            fullWidth
            onPress={onEdit}
          />
        ) : undefined
      }
    >
      {children}
    </Screen>
  );
};

export default ViewProfileScreen;
