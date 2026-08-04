import React, { useState } from 'react';
import { Linking, View } from 'react-native';

import { CatalogRecord, SightingRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, Button, StatusPill } from '../design';
import { DetailHero, FieldNoteSection, MapInset, MetadataRow } from '../details';

interface CatalogEntryElementProps {
  readonly entry: CatalogRecord;
  readonly media: readonly DisplayMediaAsset[];
  readonly sightings: readonly SightingRecord[];
}

const CatalogEntryElement: React.FC<CatalogEntryElementProps> = ({ entry, media, sightings }) => {
  const theme = useAppTheme();
  const [showDetails, setShowDetails] = useState(false);
  const cat = entry.cat;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <DetailHero title={cat.name} media={media} />
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="pageTitle">{cat.name}</AppText>
        <AppText color="muted">{cat.descShort}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {entry.source === 'inaturalist' ? (
            <StatusPill label="iNaturalist guide" tone="info" icon="leaf-outline" />
          ) : null}
          <StatusPill label={cat.currentStatus ?? 'Status unknown'} tone="info" icon="paw" />
          <StatusPill
            label={cat.tnr === 'Yes' ? 'TNR complete' : `TNR: ${cat.tnr ?? 'Unknown'}`}
            tone={cat.tnr === 'Yes' ? 'success' : 'neutral'}
            icon="shield-checkmark-outline"
          />
        </View>
      </View>
      <FieldNoteSection title="Profile" icon="book-outline">
        <AppText>{cat.descLong || cat.descShort}</AppText>
      </FieldNoteSection>
      <FieldNoteSection title="Recent sightings" icon="location-outline">
        <MapInset
          label={`Map showing sightings of ${cat.name}`}
          markers={sightings.flatMap((sighting) => sighting.location ? [{
            id: sighting.id,
            location: sighting.location,
            title: sighting.name,
            description: sighting.info,
          }] : [])}
        />
      </FieldNoteSection>
      <Button
        label={showDetails ? 'Show fewer field notes' : 'Show all field notes'}
        variant="secondary"
        fullWidth
        onPress={() => setShowDetails((visible) => !visible)}
      />
      {showDetails ? (
        <FieldNoteSection title="Field notes" icon="document-text-outline">
          <MetadataRow label="Detailed color pattern" value={cat.colorPattern || 'Unknown'} />
          {cat.behavior ? <MetadataRow label="Behavior" value={cat.behavior} /> : null}
          <MetadataRow label="Years recorded" value={cat.yearsRecorded || 'Unknown'} />
          <MetadataRow label="Area of residence" value={cat.AoR || 'Unknown'} />
          <MetadataRow label="Current status" value={cat.currentStatus || 'Unknown'} />
          <MetadataRow label="Fur length" value={cat.furLength || 'Unknown'} />
          <MetadataRow label="Fur pattern" value={cat.furPattern || 'Unknown'} />
          <MetadataRow label="TNR" value={cat.tnr || 'Unknown'} />
          <MetadataRow label="Sex" value={cat.sex || 'Unknown'} />
          {entry.credits ? <MetadataRow label="Sources and credits" value={entry.credits} /> : null}
        </FieldNoteSection>
      ) : null}
      {entry.source === 'inaturalist' ? (
        <FieldNoteSection title="iNaturalist source" icon="leaf-outline">
          <AppText
            color="primary"
            accessibilityRole="link"
            accessibilityHint="Opens this profile on iNaturalist"
            onPress={() => void Linking.openURL(entry.sourceUrl)}
          >
            View in the Georgia Tech Cats guide
          </AppText>
          {entry.localContribution ? (
            <MetadataRow label="Campus Cats contributor" value={entry.localContribution.createdBy.id} />
          ) : null}
        </FieldNoteSection>
      ) : (
        <FieldNoteSection title="Contribution" icon="person-outline">
          <MetadataRow label="Author" value={entry.createdBy.id} />
          <MetadataRow label="Posted" value={entry.createdAt.toLocaleDateString()} />
        </FieldNoteSection>
      )}
    </View>
  );
};

export { CatalogEntryElement };
