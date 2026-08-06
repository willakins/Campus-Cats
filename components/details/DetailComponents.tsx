import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Coordinates } from '../../core/domain';
import { DisplayMediaAsset, isExternalMediaAsset } from '../../core/ports';
import { useAppTheme } from '../../theme';
import { createCampusViewport } from '../mapViewport';
import { MapMarker } from '../ui/MapMarker';
import { MapView } from '../ui/MapView';
import { ProgressiveImage } from '../ui/ProgressiveImage';
import { AppText, Card } from '../design';

interface DetailHeroProps {
  readonly title: string;
  readonly media: readonly DisplayMediaAsset[];
}

export const DetailHero = ({ title, media }: DetailHeroProps) => {
  const theme = useAppTheme();
  const orderedMedia = useMemo(
    () => [
      ...media.filter(({ role }) => role === 'profile'),
      ...media.filter(({ role }) => role === 'gallery'),
    ],
    [media],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = orderedMedia[selectedIndex] ?? orderedMedia[0];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 4 / 3,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.surfaceSubtle,
        }}
      >
        {selected ? (
          <ProgressiveImage
            accessibilityLabel={`${title} photo ${selectedIndex + 1} of ${orderedMedia.length}`}
            uri={selected.url}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <>
            <Ionicons name="paw-outline" size={48} color={theme.colors.textMuted} />
            <AppText variant="label" color="muted">No photos available</AppText>
          </>
        )}
      </View>
      {orderedMedia.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.xs }}
        >
          {orderedMedia.map((asset, index) => (
            <Pressable
              key={asset.id}
              accessibilityRole="button"
              accessibilityLabel={`Show ${title} photo ${index + 1}`}
              accessibilityState={{ selected: index === selectedIndex }}
              onPress={() => setSelectedIndex(index)}
              style={({ pressed }) => ({
                width: 72,
                height: 72,
                padding: 2,
                borderRadius: theme.radii.field,
                borderWidth: index === selectedIndex ? 3 : 1,
                borderColor: index === selectedIndex ? theme.colors.primary : theme.colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <ProgressiveImage
                accessibilityLabel={`${title} thumbnail ${index + 1}`}
                loadingLabel={`Loading ${title} thumbnail ${index + 1}`}
                uri={isExternalMediaAsset(asset) ? asset.thumbnailUrl : asset.url}
                resizeMode="cover"
                style={{ width: '100%', height: '100%', borderRadius: theme.radii.field - 4 }}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {selected && isExternalMediaAsset(selected) ? (
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="caption" color="muted" selectable>
            {selected.attribution}
          </AppText>
          <AppText
            variant="caption"
            color="primary"
            accessibilityRole="link"
            accessibilityHint="Opens the photo license"
            onPress={() => void Linking.openURL(selected.licenseUrl)}
          >
            {selected.licenseCode} license
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

interface FieldNoteSectionProps {
  readonly title: string;
  readonly icon: React.ComponentProps<typeof Ionicons>['name'];
  readonly children: React.ReactNode;
}

export const FieldNoteSection = ({ title, icon, children }: FieldNoteSectionProps) => {
  const theme = useAppTheme();
  return (
    <Card>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Ionicons name={icon} size={22} color={theme.colors.primary} />
          <AppText variant="section">{title}</AppText>
        </View>
        {children}
      </View>
    </Card>
  );
};

export const MetadataRow = ({ label, value }: { label: string; value: string }) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="caption" color="muted">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
};

interface MapMarkerData {
  readonly id: string;
  readonly location: Coordinates;
  readonly title?: string;
  readonly description?: string;
}

export const MapInset = ({
  label,
  markers,
  center,
}: {
  label: string;
  markers: readonly MapMarkerData[];
  center?: Coordinates;
}) => {
  const theme = useAppTheme();
  const mapCenter = center ?? markers[0]?.location ?? { latitude: 33.7756, longitude: -84.3963 };
  return (
    <View
      accessibilityLabel={label}
      style={{ height: 220, overflow: 'hidden', borderRadius: theme.radii.card }}
    >
      <MapView
        style={{ flex: 1 }}
        appearance={theme.dark ? 'dark' : 'light'}
        initialViewport={createCampusViewport(mapCenter)}
      >
        {markers.map((marker) => (
          <MapMarker
            key={marker.id}
            coordinate={marker.location}
            title={marker.title}
            description={marker.description}
          />
        ))}
      </MapView>
    </View>
  );
};
