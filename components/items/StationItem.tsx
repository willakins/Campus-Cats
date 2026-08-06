import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';
import { appModules } from '@/composition/appModules';
import { Station, StationStockStatus } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, Card, Skeleton, StatusPill } from '../design';
import { ProgressiveImage } from '../ui/ProgressiveImage';

interface StationItemProps {
  readonly station: Station;
  readonly status: StationStockStatus;
}

export const StationItem = React.memo(function StationItem({
  station,
  status,
}: StationItemProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const [profile, setProfile] = useState<StoredMediaAsset>();
  const [mediaLoading, setMediaLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setMediaLoading(true);
    void appModules.stations.media(station.id).then((result) => {
      if (active && result.ok) {
        setProfile(result.value.find(({ role }) => role === 'profile'));
      }
      if (active) setMediaLoading(false);
    });
    return () => {
      active = false;
    };
  }, [station.id]);

  return (
    <Card
      accessibilityLabel={`View station: ${station.name}`}
      accent={theme.colors.success}
      onPress={() =>
        router.push({ pathname: '/stations/view-station', params: { id: station.id } })
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        {mediaLoading ? (
          <Skeleton
            label={`Loading ${station.name} photo`}
            width={88}
            height={88}
          />
        ) : profile ? (
          <ProgressiveImage
            accessibilityLabel={`${station.name} photo`}
            uri={profile.url}
            style={{ width: 88, height: 88, borderRadius: theme.radii.field }}
          />
        ) : (
          <View
            accessibilityLabel={`No photo for ${station.name}`}
            style={{
              width: 88,
              height: 88,
              borderRadius: theme.radii.field,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.successSurface,
            }}
          >
            <Ionicons name="basket-outline" size={30} color={theme.colors.success} />
          </View>
        )}
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="cardTitle">{station.name}</AppText>
          <StatusPill
            label={status.isStocked ? 'Stocked' : 'Needs food'}
            tone={status.isStocked ? 'success' : 'warning'}
            icon={status.isStocked ? 'checkmark-circle' : 'alert-circle'}
          />
          <AppText color="muted" numberOfLines={2}>
            Known cats: {station.knownCats || 'None listed'}
          </AppText>
        </View>
      </View>
    </Card>
  );
});

export default StationItem;
