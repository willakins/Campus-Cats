import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaInsetsContext,
} from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';
import { Button, ButtonProps } from './Actions';
import { GlassSurface } from './GlassSurface';

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export interface FormActionBarProps {
  readonly label: string;
  readonly icon?: ButtonProps['icon'];
  readonly busyLabel?: string;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly secondaryAction?: Omit<FormActionBarProps, 'secondaryAction'>;
}

export const FormActionBar = ({
  label,
  icon,
  busyLabel = 'Working…',
  busy = false,
  disabled,
  onPress,
  secondaryAction,
}: FormActionBarProps) => {
  const theme = useAppTheme();
  const insets =
    useContext(SafeAreaInsetsContext) ??
    initialWindowMetrics?.insets ??
    ZERO_INSETS;
  return (
    <View
      testID="form-action-bar"
      style={{
        pointerEvents: 'box-none',
        paddingHorizontal: theme.spacing.xxl,
        paddingTop: theme.spacing.sm,
        paddingBottom: Math.max(insets.bottom, theme.spacing.md),
      }}
    >
      <GlassSurface
        testID="form-action-bar-glass"
        style={[
          theme.elevation.floating,
          {
            width: '100%',
            maxWidth: theme.layout.maxContentWidth,
            alignSelf: 'center',
            borderRadius: theme.radii.pill,
          },
        ]}
      >
        <View
          testID="form-action-bar-tint"
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.glassSelectionBorder,
              borderRadius: theme.radii.pill,
              backgroundColor: `${theme.colors.primarySurface}D8`,
              pointerEvents: 'none',
            },
          ]}
        />
        <View
          testID="form-action-bar-actions"
          style={{ flexDirection: secondaryAction ? 'row' : 'column' }}
        >
          {secondaryAction ? (
            <View
              style={{
                flex: 1,
                borderRightWidth: StyleSheet.hairlineWidth,
                borderRightColor: theme.colors.glassSelectionBorder,
              }}
            >
              <Button
                label={secondaryAction.label}
                icon={secondaryAction.icon}
                variant="tertiary"
                fullWidth
                disabled={secondaryAction.disabled}
                loading={secondaryAction.busy}
                loadingLabel={secondaryAction.busyLabel}
                onPress={secondaryAction.onPress}
                style={{
                  minHeight: theme.layout.minTouchTarget + theme.spacing.sm,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                }}
              />
            </View>
          ) : null}
          <Button
            label={label}
            icon={icon}
            variant="tertiary"
            fullWidth={!secondaryAction}
            disabled={disabled}
            loading={busy}
            loadingLabel={busyLabel}
            onPress={onPress}
            style={{
              flex: secondaryAction ? 1.6 : undefined,
              minHeight: theme.layout.minTouchTarget + theme.spacing.sm,
              borderWidth: 0,
              backgroundColor: 'transparent',
            }}
          />
        </View>
      </GlassSurface>
    </View>
  );
};
