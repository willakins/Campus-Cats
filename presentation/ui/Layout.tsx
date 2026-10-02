import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  StyleProp,
  GestureResponderEvent,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme, useReducedMotion } from '@/theme';
import { AppLogo } from '../branding';
import { IconButton } from './Actions';
import { GlassSurface } from './GlassSurface';
import { CARD_SURFACE } from '@/theme';
import { AppText } from './Typography';
import { focusRingStyle } from './focus';
import { cardContentStyle, cardSurfaceStyle } from './Surfaces';
import {
  useCollapseFloatingTabBar,
  useFloatingTabBarContentInset,
} from '@/presentation/navigation/floatingTabBar';

const TAB_BAR_COLLAPSE_DRAG_DISTANCE = 12;

interface ScreenProps {
  readonly children: React.ReactNode;
  readonly scroll?: boolean;
  readonly keyboardAware?: boolean;
  readonly fullBleed?: boolean;
  readonly footer?: React.ReactNode;
  readonly footerPresentation?: 'docked' | 'bare' | 'floating';
  readonly floatingAction?: React.ReactNode;
  readonly floatingActionBottom?: number;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly scrollRef?: React.RefObject<ScrollView | null>;
  readonly onContentSizeChange?: ScrollViewProps['onContentSizeChange'];
}

export const Screen = ({
  children,
  scroll = false,
  keyboardAware = false,
  fullBleed = false,
  footer,
  footerPresentation = 'docked',
  floatingAction,
  floatingActionBottom,
  contentStyle,
  testID,
  scrollRef,
  onContentSizeChange,
}: ScreenProps) => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const floatingTabBarContentInset = useFloatingTabBarContentInset();
  const collapseFloatingTabBar = useCollapseFloatingTabBar();
  const touchStart = useRef<
    { readonly x: number; readonly y: number } | undefined
  >(undefined);
  const [floatingFooterHeight, setFloatingFooterHeight] = useState(0);
  const hasFloatingFooter = Boolean(
    footer && footerPresentation === 'floating',
  );
  const animationsEnabled = process.env.NODE_ENV !== 'test' && !reducedMotion;
  const opacity = useRef(new Animated.Value(animationsEnabled ? 0 : 1)).current;

  const handleTouchStart = (event: GestureResponderEvent) => {
    touchStart.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
  };
  const handleTouchMove = (event: GestureResponderEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const horizontalDistance = Math.abs(event.nativeEvent.pageX - start.x);
    const verticalDistance = Math.abs(event.nativeEvent.pageY - start.y);
    if (
      verticalDistance >= TAB_BAR_COLLAPSE_DRAG_DISTANCE &&
      verticalDistance > horizontalDistance
    ) {
      collapseFloatingTabBar();
      touchStart.current = undefined;
    }
  };
  const handleTouchEnd = () => {
    touchStart.current = undefined;
  };

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
  const baseBottomPadding = fullBleed
    ? 0
    : scroll
      ? (footer ? theme.spacing.md : theme.spacing.xl) +
        floatingTabBarContentInset
      : floatingTabBarContentInset
        ? 0
        : footer
          ? theme.spacing.md
          : theme.spacing.xl;
  const content = [
    {
      flexGrow: scroll ? 1 : undefined,
      flex: scroll ? undefined : 1,
      width: '100%' as const,
      maxWidth: fullBleed ? undefined : theme.layout.maxContentWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: fullBleed ? 0 : theme.layout.screenGutter,
      paddingBottom:
        baseBottomPadding + (hasFloatingFooter ? floatingFooterHeight : 0),
    },
    contentStyle,
  ];
  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      testID="screen-scroll-view"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={onContentSizeChange}
      contentContainerStyle={content}
      style={{ flex: 1 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID="screen-content-view" style={content}>
      {children}
    </View>
  );
  return (
    <SafeAreaView
      testID={testID}
      edges={['top', 'left', 'right']}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
                bottom:
                  floatingActionBottom ??
                  (floatingTabBarContentInset || theme.spacing.lg),
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
          {footer && footerPresentation === 'docked' ? (
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
              <View
                style={{
                  width: '100%',
                  maxWidth: theme.layout.maxContentWidth,
                  alignSelf: 'center',
                }}
              >
                {footer}
              </View>
            </View>
          ) : footer && footerPresentation === 'floating' ? (
            <View
              testID="screen-floating-footer"
              onLayout={({ nativeEvent }) => {
                const nextHeight = nativeEvent.layout.height;
                setFloatingFooterHeight((current) =>
                  current === nextHeight ? current : nextHeight,
                );
              }}
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                left: 0,
                zIndex: 10,
                pointerEvents: 'box-none',
              }}
            >
              {footer}
            </View>
          ) : (
            (footer ?? null)
          )}
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

export const AppHeader = ({
  title,
  eyebrow = 'Campus Cats',
  onBack,
  action,
}: AppHeaderProps) => {
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
      {onBack ? (
        <IconButton
          icon="arrow-back"
          accessibilityLabel="Go back"
          onPress={onBack}
        />
      ) : null}
      {!onBack ? (
        <AppLogo
          accessibilityLabel="Club logo"
          style={{
            width: theme.layout.minTouchTarget,
            height: theme.layout.minTouchTarget,
            borderRadius: theme.radii.field,
          }}
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
  /** @deprecated Cards use a neutral surface; communicate status with badges or icons. */
  readonly accent?: string;
  readonly padded?: boolean;
  readonly elevated?: boolean;
  readonly surface?: 'glass' | 'solid';
  readonly clipsContent?: boolean;
  readonly onLayout?: ViewProps['onLayout'];
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

interface CardContentProps {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export const CardContent = ({ children, style }: CardContentProps) => {
  const theme = useAppTheme();
  return <View style={[cardContentStyle(theme), style]}>{children}</View>;
};

export const Card = ({
  children,
  onPress,
  accessibilityLabel,
  padded = true,
  elevated = true,
  surface = CARD_SURFACE,
  clipsContent = true,
  onLayout,
  testID,
  style,
}: CardProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const cardStyle: StyleProp<ViewStyle> = [
    cardSurfaceStyle(theme, { clipsContent, elevated, padded, surface }),
    style,
  ];
  const content = (
    <>
      {surface === 'glass' ? (
        <GlassSurface
          variant="card"
          accessible={false}
          testID={testID ? `${testID}-glass` : undefined}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
      ) : null}
      {children}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onLayout={onLayout}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        cardStyle,
        { opacity: pressed ? 0.86 : 1 },
        focusRingStyle(focused, theme.colors.info),
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View testID={testID} onLayout={onLayout} style={cardStyle}>
      {content}
    </View>
  );
};

interface ListRowProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: React.ComponentProps<typeof Ionicons>['name'];
  readonly onPress?: () => void;
  readonly trailing?: React.ReactNode;
}

export const ListRow = ({
  title,
  subtitle,
  icon,
  onPress,
  trailing,
}: ListRowProps) => {
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
      {icon ? (
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="cardTitle">{title}</AppText>
        {subtitle ? <AppText color="muted">{subtitle}</AppText> : null}
      </View>
      {trailing ??
        (onPress ? (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textMuted}
          />
        ) : null)}
    </Pressable>
  );
};
