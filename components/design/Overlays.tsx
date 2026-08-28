import React from 'react';
import {
  DimensionValue,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

import { useAppTheme, useReducedMotion } from '../../theme';

interface OverlaySurfaceProps {
  readonly visible: boolean;
  readonly closeLabel: string;
  readonly children: React.ReactNode;
  readonly onClose: () => void;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly maxWidth?: number;
  readonly maxHeight?: DimensionValue;
  readonly dismissible?: boolean;
}

interface OverlayRootProps {
  readonly visible: boolean;
  readonly closeLabel: string;
  readonly alignment: 'center' | 'bottom';
  readonly children: React.ReactNode;
  readonly onClose: () => void;
  readonly dismissible: boolean;
}

const OverlayRoot = ({
  visible,
  closeLabel,
  alignment,
  children,
  onClose,
  dismissible,
}: OverlayRootProps) => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={dismissible ? onClose : () => undefined}
    >
      <KeyboardAvoidingView
        accessibilityViewIsModal
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: alignment === 'center' ? 'center' : 'flex-end',
          padding: alignment === 'center' ? theme.layout.screenGutter : 0,
        }}
      >
        {dismissible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: theme.colors.overlay,
            }}
          />
        ) : (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: theme.colors.overlay,
            }}
          />
        )}
        {children}
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const Dialog = ({
  visible,
  closeLabel,
  children,
  onClose,
  contentStyle,
  maxWidth = 420,
  maxHeight = '90%',
  dismissible = true,
}: OverlaySurfaceProps) => {
  const theme = useAppTheme();
  return (
    <OverlayRoot
      visible={visible}
      closeLabel={closeLabel}
      alignment="center"
      onClose={onClose}
      dismissible={dismissible}
    >
      <View
        style={[
          theme.elevation.floating,
          {
            width: '100%',
            maxWidth,
            maxHeight,
            overflow: 'hidden',
            borderRadius: theme.radii.sheet,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <ScrollView
          testID="dialog-scroll-view"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              gap: theme.spacing.sm,
              padding: theme.spacing.md,
            },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    </OverlayRoot>
  );
};

export const BottomSheet = ({
  visible,
  closeLabel,
  children,
  onClose,
  contentStyle,
  maxWidth,
  maxHeight = '90%',
  dismissible = true,
}: OverlaySurfaceProps) => {
  const theme = useAppTheme();
  return (
    <OverlayRoot
      visible={visible}
      closeLabel={closeLabel}
      alignment="bottom"
      onClose={onClose}
      dismissible={dismissible}
    >
      <View
        style={[
          theme.elevation.floating,
          {
            width: '100%',
            maxWidth: maxWidth ?? theme.layout.maxContentWidth,
            maxHeight,
            alignSelf: 'center',
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
            borderTopLeftRadius: theme.radii.sheet,
            borderTopRightRadius: theme.radii.sheet,
            backgroundColor: theme.colors.surface,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </OverlayRoot>
  );
};
