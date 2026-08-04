import React from 'react';
import { Linking, View } from 'react-native';

import { SightingRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, StatusPill } from '../design';
import { DetailHero, FieldNoteSection, MapInset, MetadataRow } from '../details';

interface SightingEntryProps {
  readonly sighting: SightingRecord;
  readonly media: readonly DisplayMediaAsset[];
}

const formatSightingDate = (sighting: SightingRecord): string => {
  if (sighting.source === 'inaturalist') {
    if (sighting.observedTimePrecision === 'date') {
      return new Date(`${sighting.observedOn}T12:00:00`).toLocaleDateString(
        'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      );
    }
    return sighting.date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return `${sighting.timeOfDay} of ${sighting.date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const qualityLabel = (quality: 'casual' | 'needs_id' | 'research') =>
  ({ casual: 'Casual', needs_id: 'Needs ID', research: 'Research grade' })[
    quality
  ];

const SightingEntry: React.FC<SightingEntryProps> = ({ sighting, media }) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <DetailHero title={sighting.name} media={media} />
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="pageTitle">{sighting.name}</AppText>
        <AppText color="muted">{formatSightingDate(sighting)}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {sighting.source === 'inaturalist' ? (
            <>
              <StatusPill label="iNaturalist" tone="info" icon="leaf-outline" />
              <StatusPill
                label={qualityLabel(sighting.qualityGrade)}
                tone={sighting.qualityGrade === 'research' ? 'success' : 'neutral'}
                icon="ribbon-outline"
              />
            </>
          ) : (
            <>
              <StatusPill
                label={sighting.fed ? 'Was fed' : 'Not fed'}
                tone={sighting.fed ? 'success' : 'warning'}
                icon={sighting.fed ? 'checkmark-circle' : 'alert-circle'}
              />
              <StatusPill
                label={sighting.health ? 'Appeared healthy' : 'Health concern'}
                tone={sighting.health ? 'success' : 'danger'}
                icon={sighting.health ? 'heart' : 'medkit'}
              />
            </>
          )}
        </View>
      </View>
      {sighting.location ? (
        <FieldNoteSection title="Location" icon="location-outline">
          <MapInset
            label={`Map showing ${sighting.name}'s sighting location`}
            center={sighting.location}
            markers={[{
              id: sighting.id,
              location: sighting.location,
              title: sighting.name,
              description: sighting.info,
            }]}
          />
        </FieldNoteSection>
      ) : sighting.source === 'inaturalist' ? (
        <FieldNoteSection title="Location" icon="location-outline">
          <AppText color="muted">Public coordinates are not available for this observation.</AppText>
        </FieldNoteSection>
      ) : null}
      {sighting.info ? (
        <FieldNoteSection title="Field notes" icon="document-text-outline">
          <AppText>{sighting.info}</AppText>
        </FieldNoteSection>
      ) : null}
      {sighting.source === 'inaturalist' ? (
        <FieldNoteSection title="iNaturalist source" icon="leaf-outline">
          <MetadataRow
            label="Observer"
            value={sighting.observer.displayName ?? sighting.observer.login}
          />
          {sighting.observationFieldValue ? (
            <MetadataRow label="Georgia Tech Cats field" value={sighting.observationFieldValue} />
          ) : null}
          <AppText
            color="primary"
            accessibilityRole="link"
            accessibilityHint="Opens this observation on iNaturalist"
            onPress={() => void Linking.openURL(sighting.sourceUrl)}
          >
            View on iNaturalist
          </AppText>
        </FieldNoteSection>
      ) : (
        <FieldNoteSection title="Contribution" icon="person-outline">
          <MetadataRow label="Author" value={sighting.createdBy.id} />
        </FieldNoteSection>
      )}
    </View>
  );
};

export { SightingEntry };
