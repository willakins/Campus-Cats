import React from 'react';
import { View } from 'react-native';

import { PublicProfile, Station, StationStockStatus } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, StatusPill } from '../design';
import { DetailHero, FieldNoteSection, MapInset, MetadataRow } from '../details';
import { MemberIdentity } from '../profile/MemberIdentity';

interface StationEntryProps {
  readonly station: Station;
  readonly status: StationStockStatus;
  readonly media: readonly StoredMediaAsset[];
  readonly contributorProfile?: PublicProfile;
  readonly onContributorPress?: () => void;
}

export const StationEntry: React.FC<StationEntryProps> = ({
  station,
  status,
  media,
  contributorProfile,
  onContributorPress,
}) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <DetailHero title={station.name} media={media} />
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="pageTitle">{station.name}</AppText>
        <StatusPill
          label={status.isStocked ? 'Stocked' : 'Needs food'}
          tone={status.isStocked ? 'success' : 'warning'}
          icon={status.isStocked ? 'checkmark-circle' : 'alert-circle'}
        />
        <AppText color="muted">
          {status.isStocked
            ? `Restock due in ${status.daysRemaining} ${status.daysRemaining === 1 ? 'day' : 'days'}.`
            : 'This station needs to be restocked.'}
        </AppText>
      </View>
      <FieldNoteSection title="Location" icon="location-outline">
        <MapInset
          label={`Map showing ${station.name}`}
          center={station.location}
          markers={[{ id: station.id, location: station.location, title: station.name }]}
        />
      </FieldNoteSection>
      <FieldNoteSection title="Station notes" icon="paw-outline">
        <MetadataRow label="Known cats" value={station.knownCats || 'None listed'} />
        <MetadataRow label="Stocking frequency" value={`Every ${station.stockingFreq} days`} />
      </FieldNoteSection>
      <FieldNoteSection title="Contribution" icon="person-outline">
        <MemberIdentity
          profile={contributorProfile}
          fallbackEmail={station.createdBy.email}
          onPress={onContributorPress ?? (() => undefined)}
        />
      </FieldNoteSection>
    </View>
  );
};
