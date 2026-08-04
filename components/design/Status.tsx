import React from 'react';
import { Pressable, View, ViewProps } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppColors, useAppTheme } from '../../theme';
import { Button } from './Actions';
import { AppText } from './Typography';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneColors = (tone: Tone, colors: AppColors): readonly [string, string] => {
  const tones: Record<Tone, readonly [string, string]> = {
    neutral: [colors.surfaceSubtle, colors.text],
    primary: [colors.primarySurface, colors.primary],
    success: [colors.successSurface, colors.success],
    warning: [colors.warningSurface, colors.warning],
    danger: [colors.dangerSurface, colors.danger],
    info: [colors.infoSurface, colors.info],
  };
  return tones[tone];
};

interface ChipProps {
  readonly label: string;
  readonly selected?: boolean;
  readonly onPress?: () => void;
}

export const Chip = ({ label, selected = false, onPress }: ChipProps) => {
  const theme = useAppTheme();
  const content = (
    <AppText
      variant="label"
      style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}
    >
      {label}
    </AppText>
  );
  const style = {
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: selected ? theme.colors.primary : theme.colors.border,
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
};

interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

interface SegmentedControlProps<Value extends string> {
  readonly label: string;
  readonly value: Value;
  readonly options: readonly SegmentedOption<Value>[];
  readonly onChange: (value: Value) => void;
}

export const SegmentedControl = <Value extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<Value>) => {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
};

interface StatusPillProps extends ViewProps {
  readonly label: string;
  readonly tone: Tone;
  readonly icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export const StatusPill = ({ label, tone, icon, style, ...props }: StatusPillProps) => {
  const theme = useAppTheme();
  const [backgroundColor, foreground] = toneColors(tone, theme.colors);
  return (
    <View
      accessibilityLabel={label}
      {...props}
      style={[
        {
          alignSelf: 'flex-start',
          minHeight: 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xxs,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xxs,
          borderRadius: theme.radii.pill,
          backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={foreground} /> : null}
      <AppText variant="label" style={{ color: foreground }}>
        {label}
      </AppText>
    </View>
  );
};

interface StateProps {
  readonly title: string;
  readonly message: string;
  readonly icon: React.ComponentProps<typeof Ionicons>['name'];
  readonly tone?: Tone;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

const StateView = ({ title, message, icon, tone = 'neutral', actionLabel, onAction }: StateProps) => {
  const theme = useAppTheme();
  const [, foreground] = toneColors(tone, theme.colors);
  return (
    <View
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={{ alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.xxl }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceSubtle,
        }}
      >
        <Ionicons name={icon} size={28} color={foreground} />
      </View>
      <AppText variant="section" style={{ textAlign: 'center' }}>{title}</AppText>
      <AppText color="muted" style={{ textAlign: 'center' }}>{message}</AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
};

export const EmptyState = ({ title, message, actionLabel, onAction }: Omit<StateProps, 'icon'>) => (
  <StateView title={title} message={message} icon="paw-outline" actionLabel={actionLabel} onAction={onAction} />
);

export const ErrorState = ({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) => (
  <StateView title={title} message={message} icon="cloud-offline-outline" tone="danger" actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} />
);

export const AccessDeniedState = ({ message }: { message: string }) => (
  <StateView title="Access restricted" message={message} icon="lock-closed-outline" tone="warning" />
);

export const FeedbackBanner = ({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: Exclude<Tone, 'neutral' | 'primary'>;
}) => {
  const theme = useAppTheme();
  const [backgroundColor, foreground] = toneColors(tone, theme.colors);
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      accessibilityRole="alert"
      style={{
        padding: theme.spacing.sm,
        borderRadius: theme.radii.field,
        backgroundColor,
        flexDirection: 'row',
        gap: theme.spacing.xs,
      }}
    >
      <Ionicons name={tone === 'danger' ? 'alert-circle' : 'information-circle'} size={20} color={foreground} />
      <AppText style={{ color: foreground, flex: 1 }}>{message}</AppText>
    </View>
  );
};

export const Skeleton = ({ label = 'Loading content' }: { label?: string }) => {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={{
        minHeight: 120,
        borderRadius: theme.radii.card,
        backgroundColor: theme.colors.surfaceSubtle,
      }}
    />
  );
};
