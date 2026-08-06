import React, { useEffect, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

import { useAppTheme, useReducedMotion } from '../../theme';

interface LoadingRegionProps {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

const LoadingRegion = ({ label, children, style }: LoadingRegionProps) => {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.56)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || reducedMotion) {
      opacity.setValue(0.72);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 720,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.56,
          duration: 720,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={style}
    >
      <Animated.View
        style={{ opacity, pointerEvents: 'none' }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const SkeletonShape = ({
  width = '100%',
  height,
  borderRadius,
  style,
}: {
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;
  readonly borderRadius?: number;
  readonly style?: StyleProp<ViewStyle>;
}) => {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? theme.radii.field,
          backgroundColor: theme.colors.surfaceSubtle,
        },
        style,
      ]}
    />
  );
};

export const Skeleton = ({
  label = 'Loading content',
  height = 120,
  width = '100%',
  style,
  shapeStyle,
}: {
  readonly label?: string;
  readonly height?: DimensionValue;
  readonly width?: DimensionValue;
  readonly style?: StyleProp<ViewStyle>;
  readonly shapeStyle?: StyleProp<ViewStyle>;
}) => (
  <LoadingRegion label={label} style={style}>
    <SkeletonShape width={width} height={height} style={shapeStyle} />
  </LoadingRegion>
);

type ListSkeletonLayout = 'text' | 'cover' | 'leading' | 'actions';

const TextLines = ({ compact = false }: { readonly compact?: boolean }) => {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, gap: theme.spacing.xs }}>
      <SkeletonShape width="34%" height={12} borderRadius={theme.radii.pill} />
      <SkeletonShape width="72%" height={compact ? 18 : 22} borderRadius={theme.radii.pill} />
      <SkeletonShape width="100%" height={14} borderRadius={theme.radii.pill} />
      <SkeletonShape width="62%" height={14} borderRadius={theme.radii.pill} />
    </View>
  );
};

const SkeletonCard = ({ layout }: { readonly layout: ListSkeletonLayout }) => {
  const theme = useAppTheme();
  const baseStyle: StyleProp<ViewStyle> = [
    theme.elevation.card,
    {
      overflow: 'hidden',
      borderRadius: theme.radii.card,
      backgroundColor: theme.colors.surface,
    },
  ];

  if (layout === 'cover') {
    return (
      <View style={[baseStyle, { flex: 1 }]}>
        <SkeletonShape style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 0 }} />
        <View style={{ padding: theme.spacing.md }}>
          <TextLines compact />
        </View>
      </View>
    );
  }

  if (layout === 'leading') {
    return (
      <View style={[baseStyle, { padding: theme.spacing.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <SkeletonShape width={88} height={88} />
          <TextLines compact />
        </View>
      </View>
    );
  }

  if (layout === 'actions') {
    return (
      <View style={[baseStyle, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
        <TextLines compact />
        <SkeletonShape width="44%" height={32} borderRadius={theme.radii.pill} />
        <SkeletonShape height={44} />
        <SkeletonShape height={44} />
      </View>
    );
  }

  return (
    <View style={[baseStyle, { padding: theme.spacing.md }]}>
      <TextLines />
    </View>
  );
};

export const CardListSkeleton = ({
  label,
  count = 3,
  columns = 1,
  layout = 'text',
}: {
  readonly label: string;
  readonly count?: number;
  readonly columns?: number;
  readonly layout?: ListSkeletonLayout;
}) => {
  const theme = useAppTheme();
  const items = Array.from({ length: count }, (_, index) => index);
  const rows = Array.from(
    { length: Math.ceil(items.length / columns) },
    (_, rowIndex) => items.slice(rowIndex * columns, (rowIndex + 1) * columns),
  );

  return (
    <LoadingRegion label={label} style={{ flex: 1 }}>
      <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.md }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {row.map((item) => (
              <View key={item} style={{ flex: 1, minWidth: 0 }}>
                <SkeletonCard layout={layout} />
              </View>
            ))}
            {Array.from({ length: columns - row.length }, (_, filler) => (
              <View key={`filler-${filler}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>
    </LoadingRegion>
  );
};

export const DetailSkeleton = ({ label }: { readonly label: string }) => {
  const theme = useAppTheme();
  return (
    <LoadingRegion label={label}>
      <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
        <SkeletonShape style={{ width: '100%', aspectRatio: 4 / 3 }} />
        <View style={{ gap: theme.spacing.xs }}>
          <SkeletonShape width="58%" height={32} borderRadius={theme.radii.pill} />
          <SkeletonShape width="42%" height={16} borderRadius={theme.radii.pill} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <SkeletonShape width={108} height={32} borderRadius={theme.radii.pill} />
            <SkeletonShape width={92} height={32} borderRadius={theme.radii.pill} />
          </View>
        </View>
        {[0, 1].map((item) => (
          <View
            key={item}
            style={[
              theme.elevation.card,
              {
                gap: theme.spacing.sm,
                padding: theme.spacing.md,
                borderRadius: theme.radii.card,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <SkeletonShape width="38%" height={22} borderRadius={theme.radii.pill} />
            <SkeletonShape height={16} borderRadius={theme.radii.pill} />
            <SkeletonShape width="76%" height={16} borderRadius={theme.radii.pill} />
          </View>
        ))}
      </View>
    </LoadingRegion>
  );
};

export const FormSkeleton = ({
  label,
  fields = 4,
}: {
  readonly label: string;
  readonly fields?: number;
}) => {
  const theme = useAppTheme();
  return (
    <LoadingRegion label={label}>
      <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <SkeletonShape width="32%" height={24} borderRadius={theme.radii.pill} />
          {Array.from({ length: fields }, (_, index) => (
            <View key={index} style={{ gap: theme.spacing.xxs }}>
              <SkeletonShape width={index % 2 === 0 ? '30%' : '42%'} height={14} borderRadius={theme.radii.pill} />
              <SkeletonShape height={index === fields - 1 ? 96 : 48} />
            </View>
          ))}
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <SkeletonShape width="38%" height={24} borderRadius={theme.radii.pill} />
          <SkeletonShape style={{ width: '100%', aspectRatio: 16 / 7 }} />
        </View>
      </View>
    </LoadingRegion>
  );
};

export const StartupSkeleton = ({ label }: { readonly label: string }) => {
  const theme = useAppTheme();
  return (
    <LoadingRegion
      label={label}
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: theme.layout.maxAuthWidth,
          alignSelf: 'center',
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <SkeletonShape width={136} height={136} borderRadius={theme.radii.card} />
          <SkeletonShape width="68%" height={32} borderRadius={theme.radii.pill} />
          <SkeletonShape width="82%" height={16} borderRadius={theme.radii.pill} />
        </View>
        <View
          style={[
            theme.elevation.card,
            {
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
              borderRadius: theme.radii.card,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <SkeletonShape height={48} borderRadius={theme.radii.pill} />
          <SkeletonShape width="44%" height={14} borderRadius={theme.radii.pill} />
          <SkeletonShape height={48} />
          <SkeletonShape height={48} />
        </View>
      </View>
    </LoadingRegion>
  );
};
