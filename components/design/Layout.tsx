import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme, useReducedMotion } from '../../theme';
import { AppLogo } from '../branding';
import { IconButton } from './Actions';
import { AppText } from './Typography';
import { focusRingStyle } from './focus';

interface ScreenProps {
  readonly children: React.ReactNode;
  readonly scroll?: boolean;
  readonly keyboardAware?: boolean;
  readonly fullBleed?: boolean;
  readonly footer?: React.ReactNode;
  readonly floatingAction?: React.ReactNode;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const Screen = ({
  children,
  scroll = false,
  keyboardAware = false,
  fullBleed = false,
  footer,
  floatingAction,
  contentStyle,
  testID,
}: ScreenProps) => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = process.env.NODE_ENV !== 'test' && !reducedMotion;
  const opacity = useRef(new Animated.Value(animationsEnabled ? 0 : 1)).current;

  useEffect(() => {
    if (!animationsEnabled) {
      opacity.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: theme.motion.content,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [animationsEnabled, opacity, theme.motion.content]);
  const content = [
    {
      flexGrow: scroll ? 1 : undefined,
      flex: scroll ? undefined : 1,
      width: '100%' as const,
      maxWidth: fullBleed ? undefined : theme.layout.maxContentWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: fullBleed ? 0 : theme.layout.screenGutter,
      paddingBottom: fullBleed ? 0 : footer ? theme.spacing.md : theme.spacing.xl,
    },
    contentStyle,
  ];
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={content}
      style={{ flex: 1 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={content}>{children}</View>
  );
  return (
    <SafeAreaView
      testID={testID}
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <Animated.View style={{ flex: 1, opacity }}>
        <KeyboardAvoidingView
          enabled={keyboardAware}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {body}
          {floatingAction ? (
            <View
              style={{
                pointerEvents: 'box-none',
                position: 'absolute',
                right: 0,
                bottom: theme.spacing.lg,
                left: 0,
                zIndex: 10,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  pointerEvents: 'box-none',
                  width: '100%',
                  maxWidth: theme.layout.maxContentWidth,
                  paddingHorizontal: fullBleed
                    ? theme.spacing.lg
                    : theme.layout.screenGutter,
                  alignItems: 'flex-end',
                }}
              >
                {floatingAction}
              </View>
            </View>
          ) : null}
          {footer ? (
            <View
              style={{
                paddingHorizontal: theme.layout.screenGutter,
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.md,
                backgroundColor: theme.colors.surface,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' }}>
                {footer}
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
};

interface AppHeaderProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly onBack?: () => void;
  readonly action?: React.ReactNode;
}

export const AppHeader = ({ title, eyebrow = 'Campus Cats', onBack, action }: AppHeaderProps) => {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={title}
      style={{
        minHeight: 88,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      }}
    >
      {onBack ? <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={onBack} /> : null}
      {!onBack ? (
        <AppLogo
          accessibilityLabel="Club logo"
          style={{ width: theme.layout.minTouchTarget, height: theme.layout.minTouchTarget }}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText
          variant="caption"
          color="primary"
          style={{ textTransform: 'uppercase', letterSpacing: 1 }}
        >
          {eyebrow}
        </AppText>
        <AppText variant="pageTitle">{title}</AppText>
      </View>
      {action}
    </View>
  );
};

interface CardProps {
  readonly children: React.ReactNode;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, onPress, accessibilityLabel, accent, style }: CardProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const cardStyle: StyleProp<ViewStyle> = [
    theme.elevation.card,
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.card,
      padding: theme.spacing.md,
      overflow: 'hidden',
      borderLeftWidth: accent ? 5 : undefined,
      borderLeftColor: accent,
    },
    style,
  ];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        cardStyle,
        { opacity: pressed ? 0.86 : 1 },
        focusRingStyle(focused, theme.colors.info),
      ]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={cardStyle}>{children}</View>
  );
};

interface ListRowProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: React.ComponentProps<typeof Ionicons>['name'];
  readonly onPress?: () => void;
  readonly trailing?: React.ReactNode;
}

export const ListRow = ({ title, subtitle, icon, onPress, trailing }: ListRowProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? title : undefined}
      onPress={onPress}
      disabled={!onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          opacity: pressed ? 0.8 : 1,
        },
        focusRingStyle(focused, theme.colors.info),
      ]}
    >
      {icon ? <Ionicons name={icon} size={24} color={theme.colors.primary} /> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="cardTitle">{title}</AppText>
        {subtitle ? <AppText color="muted">{subtitle}</AppText> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} /> : null)}
    </Pressable>
  );
};
