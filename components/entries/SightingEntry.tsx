import React from 'react';
import { View } from 'react-native';

import { Sighting } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, StatusPill } from '../design';
import { DetailHero, FieldNoteSection, MapInset, MetadataRow } from '../details';

interface SightingEntryProps {
  readonly sighting: Sighting;
  readonly media: readonly StoredMediaAsset[];
}

const formatSightingDate = (sighting: Sighting): string =>
  `${sighting.timeOfDay} of ${sighting.date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;

const SightingEntry: React.FC<SightingEntryProps> = ({ sighting, media }) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <DetailHero title={sighting.name} media={media} />
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="pageTitle">{sighting.name}</AppText>
        <AppText color="muted">{formatSightingDate(sighting)}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
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
        </View>
      </View>
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
      {sighting.info ? (
        <FieldNoteSection title="Field notes" icon="document-text-outline">
          <AppText>{sighting.info}</AppText>
        </FieldNoteSection>
      ) : null}
      <FieldNoteSection title="Contribution" icon="person-outline">
        <MetadataRow label="Author" value={sighting.createdBy.id} />
      </FieldNoteSection>
    </View>
  );
};

export { SightingEntry };
