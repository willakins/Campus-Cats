import React, { useState } from 'react';
import { View } from 'react-native';

import { CatalogEntry, Sighting } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, Button, StatusPill } from '../design';
import { DetailHero, FieldNoteSection, MapInset, MetadataRow } from '../details';

interface CatalogEntryElementProps {
  readonly entry: CatalogEntry;
  readonly media: readonly StoredMediaAsset[];
  readonly sightings: readonly Sighting[];
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
          <StatusPill label={cat.currentStatus} tone="info" icon="paw" />
          <StatusPill
            label={cat.tnr === 'Yes' ? 'TNR complete' : `TNR: ${cat.tnr}`}
            tone={cat.tnr === 'Yes' ? 'success' : 'neutral'}
            icon="shield-checkmark-outline"
          />
        </View>
      </View>
      <FieldNoteSection title="Profile" icon="book-outline">
        <AppText>{cat.descLong}</AppText>
      </FieldNoteSection>
      <FieldNoteSection title="Recent sightings" icon="location-outline">
        <MapInset
          label={`Map showing sightings of ${cat.name}`}
          markers={sightings.map((sighting) => ({
            id: sighting.id,
            location: sighting.location,
            title: sighting.name,
            description: sighting.info,
          }))}
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
          <MetadataRow label="Detailed color pattern" value={cat.colorPattern} />
          {cat.behavior ? <MetadataRow label="Behavior" value={cat.behavior} /> : null}
          <MetadataRow label="Years recorded" value={cat.yearsRecorded} />
          <MetadataRow label="Area of residence" value={cat.AoR} />
          <MetadataRow label="Current status" value={cat.currentStatus} />
          <MetadataRow label="Fur length" value={cat.furLength} />
          <MetadataRow label="Fur pattern" value={cat.furPattern} />
          <MetadataRow label="TNR" value={cat.tnr} />
          <MetadataRow label="Sex" value={cat.sex} />
          {entry.credits ? <MetadataRow label="Sources and credits" value={entry.credits} /> : null}
        </FieldNoteSection>
      ) : null}
      <FieldNoteSection title="Contribution" icon="person-outline">
        <MetadataRow label="Author" value={entry.createdBy.id} />
        <MetadataRow label="Posted" value={entry.createdAt.toLocaleDateString()} />
      </FieldNoteSection>
    </View>
  );
};

export { CatalogEntryElement };
