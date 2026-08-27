import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, View } from 'react-native';

import { useAppTheme } from '../../theme';

interface TimelineSliderProps {
  readonly label: string;
  readonly valueLabel: string;
  readonly value: number;
  readonly maximum: number;
  readonly onChange: (value: number) => void;
}

export const TimelineSlider = ({
  label,
  valueLabel,
  value,
  maximum,
  onChange,
}: TimelineSliderProps) => {
  const theme = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const boundedMaximum = Math.max(0, maximum);
  const boundedValue = Math.min(Math.max(0, value), boundedMaximum);
  const progress = boundedMaximum === 0 ? 1 : boundedValue / boundedMaximum;

  const changeFromTouch = useCallback(
    (event: GestureResponderEvent) => {
      if (trackWidth === 0 || boundedMaximum === 0) return;
      const ratio = Math.min(
        1,
        Math.max(0, event.nativeEvent.locationX / trackWidth),
      );
      onChange(Math.round(ratio * boundedMaximum));
    },
    [boundedMaximum, onChange, trackWidth],
  );

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: boundedMaximum,
        now: boundedValue,
        text: valueLabel,
      }}
      accessibilityActions={[
        { name: 'decrement', label: 'Previous sighting' },
        { name: 'increment', label: 'Next sighting' },
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'decrement') {
          onChange(Math.max(0, boundedValue - 1));
        }
        if (nativeEvent.actionName === 'increment') {
          onChange(Math.min(boundedMaximum, boundedValue + 1));
        }
      }}
      onLayout={({ nativeEvent }) => setTrackWidth(nativeEvent.layout.width)}
      onStartShouldSetResponder={() => boundedMaximum > 0}
      onMoveShouldSetResponder={() => boundedMaximum > 0}
      onResponderGrant={changeFromTouch}
      onResponderMove={changeFromTouch}
      style={{
        minHeight: theme.layout.minTouchTarget,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          height: 6,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.border,
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: 6,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.primary,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -7,
            left: `${progress * 100}%`,
            width: 20,
            height: 20,
            marginLeft: -10,
            borderRadius: theme.radii.pill,
            borderWidth: 3,
            borderColor: theme.colors.surface,
            backgroundColor: theme.colors.primary,
          }}
        />
      </View>
    </View>
  );
};
