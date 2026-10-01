import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, PanResponder, Platform, View } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaInsetsContext,
} from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme, useReducedMotion } from '@/theme';
import { AppText } from './Typography';

const DEFAULT_TOAST_DURATION = 5000;
const TOAST_VERTICAL_OFFSET = -240;
const SWIPE_DISMISS_DISTANCE = 48;
const SWIPE_DISMISS_VELOCITY = -0.75;
const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

interface ToastBannerProps {
  readonly message: string;
  readonly tone: 'success' | 'danger';
  readonly duration?: number;
  readonly onDismiss?: () => void;
}

export const ToastBanner = ({
  message,
  tone,
  duration = DEFAULT_TOAST_DURATION,
  onDismiss,
}: ToastBannerProps) => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const insets =
    useContext(SafeAreaInsetsContext) ??
    initialWindowMetrics?.insets ??
    ZERO_INSETS;
  const [rendered, setRendered] = useState(true);
  const translateY = useRef(new Animated.Value(TOAST_VERTICAL_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissing = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const animationsEnabled = process.env.NODE_ENV !== 'test' && !reducedMotion;
  const backgroundColor = tone === 'success'
    ? theme.colors.successSurface
    : theme.colors.dangerSurface;
  const foreground = tone === 'success'
    ? theme.colors.success
    : theme.colors.danger;

  const finishDismissal = useCallback(() => {
    setRendered(false);
    onDismissRef.current?.();
  }, []);

  const dismiss = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    if (!animationsEnabled) {
      translateY.setValue(TOAST_VERTICAL_OFFSET);
      opacity.setValue(0);
      finishDismissal();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: TOAST_VERTICAL_OFFSET,
        duration: theme.motion.content,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: theme.motion.content,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(({ finished }) => {
      if (finished) finishDismissal();
    });
  }, [
    animationsEnabled,
    finishDismissal,
    opacity,
    theme.motion.content,
    translateY,
  ]);

  const restorePosition = useCallback(() => {
    if (!animationsEnabled) {
      translateY.setValue(0);
      return;
    }
    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [animationsEnabled, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy < -4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation();
          translateY.setValue(0);
        },
        onPanResponderMove: (_event, gestureState) => {
          translateY.setValue(Math.min(0, gestureState.dy));
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (
            gestureState.dy <= -SWIPE_DISMISS_DISTANCE ||
            gestureState.vy <= SWIPE_DISMISS_VELOCITY
          ) {
            dismiss();
            return;
          }
          restorePosition();
        },
        onPanResponderTerminate: restorePosition,
      }),
    [dismiss, restorePosition, translateY],
  );

  useEffect(() => {
    dismissing.current = false;
    setRendered(true);
    translateY.setValue(animationsEnabled ? TOAST_VERTICAL_OFFSET : 0);
    opacity.setValue(animationsEnabled ? 0 : 1);

    if (animationsEnabled) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.press,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }

    const timeout = setTimeout(dismiss, duration);
    return () => {
      clearTimeout(timeout);
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [
    animationsEnabled,
    dismiss,
    duration,
    message,
    opacity,
    theme.motion.press,
    translateY,
  ]);

  if (!rendered) return null;

  return (
    <View
      style={{
        pointerEvents: 'box-none',
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        zIndex: 1000,
        alignItems: 'center',
        paddingTop: insets.top + theme.spacing.xs,
        paddingHorizontal: theme.layout.screenGutter,
      }}
    >
      <Animated.View
        {...panResponder.panHandlers}
        accessible
        accessibilityLabel={message}
        accessibilityHint="Swipe up to dismiss"
        accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
        accessibilityRole="alert"
        accessibilityActions={[{ name: 'dismiss', label: 'Dismiss' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'dismiss') dismiss();
        }}
        style={[
          theme.elevation.floating,
          {
            width: '100%',
            maxWidth: theme.layout.maxContentWidth,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderWidth: 1,
            borderColor: foreground,
            borderRadius: theme.radii.field,
            backgroundColor,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons
          name={tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={foreground}
        />
        <AppText style={{ flex: 1, color: foreground }}>{message}</AppText>
      </Animated.View>
    </View>
  );
};

type ToastVariantProps = Omit<ToastBannerProps, 'tone'>;

export const SuccessToast = (props: ToastVariantProps) => (
  <ToastBanner {...props} tone="success" />
);

export const FailureToast = (props: ToastVariantProps) => (
  <ToastBanner {...props} tone="danger" />
);
