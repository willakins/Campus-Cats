import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { SightingRecord } from '../../core/domain';
import { useAppTheme } from '../../theme';
import { createCampusViewport } from '../mapViewport';
import { AppText } from '../design';
import { MapMarker } from '../ui/MapMarker';
import { MapPath } from '../ui/MapPath';
import { MapView } from '../ui/MapView';
import { TimelineSlider } from '../ui/TimelineSlider';

const formatSightingMoment = (sighting: SightingRecord): string => {
  const displayDate =
    sighting.source === 'inaturalist' &&
    sighting.observedTimePrecision === 'date'
      ? new Date(`${sighting.observedOn}T12:00:00`)
      : sighting.date;
  const date = displayDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  if (sighting.source === 'campus-cats') {
    return `${sighting.timeOfDay} of ${date}`;
  }
  if (sighting.observedTimePrecision === 'date') {
    return `${date} · Time not reported`;
  }
  return sighting.date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const localTimeRank: Readonly<Record<string, number>> = {
  Morning: 9,
  Afternoon: 15,
  Night: 21,
};

const chronologicalMoment = (sighting: SightingRecord): number => {
  if (
    sighting.source === 'inaturalist' &&
    sighting.observedTimePrecision === 'exact'
  ) {
    return sighting.date.getTime();
  }
  const date =
    sighting.source === 'inaturalist'
      ? new Date(`${sighting.observedOn}T00:00:00`)
      : sighting.date;
  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const hour =
    sighting.source === 'campus-cats'
      ? localTimeRank[sighting.timeOfDay] ?? 12
      : 12;
  return startOfDay + hour * 60 * 60 * 1000;
};

const compareSightings = (left: SightingRecord, right: SightingRecord) =>
  chronologicalMoment(left) - chronologicalMoment(right) ||
  left.id.localeCompare(right.id);

export const SightingHistoryMap = ({
  catName,
  sightings,
  onSightingPress,
}: {
  readonly catName: string;
  readonly sightings: readonly SightingRecord[];
  readonly onSightingPress?: (sighting: SightingRecord) => void;
}) => {
  const theme = useAppTheme();
  const mappedSightings = useMemo(
    () =>
      [...sightings]
        .filter(
          (sighting): sighting is SightingRecord & { location: NonNullable<SightingRecord['location']> } =>
            sighting.location !== null,
        )
        .sort(compareSightings),
    [sightings],
  );
  const historyKey = mappedSightings.map(({ id }) => id).join('|');
  const initialViewport = useMemo(
    () => createCampusViewport(mappedSightings[mappedSightings.length - 1]?.location),
    [mappedSightings],
  );
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, mappedSightings.length - 1),
  );

  useEffect(() => {
    setSelectedIndex(Math.max(0, mappedSightings.length - 1));
  }, [historyKey, mappedSightings.length]);

  if (mappedSightings.length === 0) {
    return (
      <AppText color="muted">
        {sightings.length === 0
          ? `No sightings have been recorded for ${catName} yet.`
          : `${sightings.length} ${sightings.length === 1 ? 'sighting has' : 'sightings have'} no public location, so a path cannot be shown.`}
      </AppText>
    );
  }

  const boundedIndex = Math.min(selectedIndex, mappedSightings.length - 1);
  const selected = mappedSightings[boundedIndex];
  const visibleSightings = mappedSightings.slice(0, boundedIndex + 1);
  const moment = formatSightingMoment(selected);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="label">
          Sighting {boundedIndex + 1} of {mappedSightings.length}
        </AppText>
        <AppText color="muted">{moment}</AppText>
      </View>
      <View
        accessibilityLabel={`Map tracing sightings of ${catName} through ${moment}`}
        style={{
          height: 260,
          overflow: 'hidden',
          borderRadius: theme.radii.card,
        }}
      >
        <MapView
          style={{ flex: 1 }}
          appearance={theme.dark ? 'dark' : 'light'}
          initialViewport={initialViewport}
        >
          {visibleSightings.length > 1 ? (
            <MapPath
              testID="sighting-history-path"
              coordinates={visibleSightings.map(({ location }) => location)}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
            />
          ) : null}
          {visibleSightings.map((sighting, index) => (
            <MapMarker
              key={sighting.id}
              coordinate={sighting.location}
              title={sighting.name}
              description={formatSightingMoment(sighting)}
              accessibilityLabel={`View ${sighting.name} sighting from ${formatSightingMoment(sighting)}`}
              accessibilityRole="button"
              onPress={
                onSightingPress
                  ? () => onSightingPress(sighting)
                  : undefined
              }
              backgroundColor={
                index === boundedIndex
                  ? theme.colors.primary
                  : theme.colors.teal
              }
            />
          ))}
        </MapView>
      </View>
      {mappedSightings.length > 1 ? (
        <>
          <TimelineSlider
            label="Sighting timeline"
            valueLabel={moment}
            value={boundedIndex}
            maximum={mappedSightings.length - 1}
            onChange={setSelectedIndex}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" color="muted">Oldest</AppText>
            <AppText variant="caption" color="muted">Newest</AppText>
          </View>
        </>
      ) : null}
      <AppText variant="caption" color="muted">
        Path through {visibleSightings.length} mapped {visibleSightings.length === 1 ? 'sighting' : 'sightings'}
      </AppText>
      {mappedSightings.length < sightings.length ? (
        <AppText variant="caption" color="muted">
          {sightings.length - mappedSightings.length} additional {sightings.length - mappedSightings.length === 1 ? 'sighting has' : 'sightings have'} no public location.
        </AppText>
      ) : null}
    </View>
  );
};
