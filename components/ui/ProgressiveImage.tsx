import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ImageResizeMode,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { Skeleton } from '../design';

interface ProgressiveImageProps {
  readonly uri: string;
  readonly accessibilityLabel: string;
  readonly loadingLabel?: string;
  readonly resizeMode?: ImageResizeMode;
  readonly style: StyleProp<ViewStyle>;
  readonly imageStyle?: StyleProp<ImageStyle>;
}

export const ProgressiveImage = ({
  uri,
  accessibilityLabel,
  loadingLabel = `Loading ${accessibilityLabel}`,
  resizeMode = 'cover',
  style,
  imageStyle,
}: ProgressiveImageProps) => {
  const [loading, setLoading] = useState(true);
  const showLoading = useCallback(() => setLoading(true), []);
  const hideLoading = useCallback(() => setLoading(false), []);

  useEffect(() => {
    setLoading(true);
  }, [uri]);

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Image
        accessibilityLabel={accessibilityLabel}
        source={{ uri }}
        resizeMode={resizeMode}
        onLoadStart={showLoading}
        onLoad={hideLoading}
        onLoadEnd={hideLoading}
        onError={hideLoading}
        style={[StyleSheet.absoluteFill, imageStyle]}
      />
      {loading ? (
        <Skeleton
          label={loadingLabel}
          height="100%"
          style={StyleSheet.absoluteFill}
          shapeStyle={{ borderRadius: 0 }}
        />
      ) : null}
    </View>
  );
};
