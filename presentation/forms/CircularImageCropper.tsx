import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  Modal,
  NativeTouchEvent,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import * as ImageManipulator from 'expo-image-manipulator';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AppHeader, AppText, Button, Screen } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

const MAX_STAGE_SIZE = 360;
const MIN_STAGE_SIZE = 200;
const VERTICAL_CHROME_HEIGHT = 280;
const CROP_INSET = 24;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface CircularImageCropperProps {
  readonly uri: string;
  readonly onCancel: () => void;
  readonly onComplete: (uri: string) => void;
}

interface ImageSize {
  readonly width: number;
  readonly height: number;
}

interface Offset {
  readonly x: number;
  readonly y: number;
}

interface TouchMetrics {
  readonly count: number;
  readonly midpoint: Offset;
  readonly distance: number;
}

interface GestureSnapshot extends TouchMetrics {
  readonly zoom: number;
  readonly offset: Offset;
  readonly stageCenter: Offset;
}

export const CircularImageCropper = ({
  uri,
  onCancel,
  onComplete,
}: CircularImageCropperProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const stageSize = Math.max(
    MIN_STAGE_SIZE,
    Math.min(
      MAX_STAGE_SIZE,
      windowWidth - theme.layout.screenGutter * 2,
      windowHeight -
        insets.top -
        insets.bottom -
        VERTICAL_CHROME_HEIGHT,
    ),
  );
  const cropSize = stageSize - CROP_INSET * 2;
  const [imageSize, setImageSize] = useState<ImageSize>();
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const gestureStart = useRef<GestureSnapshot | undefined>(undefined);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  const mountedRef = useRef(true);

  React.useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  React.useEffect(() => {
    setImageSize(undefined);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setError(undefined);
    Image.getSize(
      uri,
      (width, height) => setImageSize({ width, height }),
      () => setError('Could not prepare this photo for cropping.'),
    );
  }, [uri]);

  const geometry = imageSize
    ? imageGeometry(imageSize, cropSize, zoom)
    : undefined;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          gestureStart.current = gestureSnapshot(
            event,
            zoomRef.current,
            offsetRef.current,
            stageSize,
          );
        },
        onPanResponderMove: (event) => {
          if (!imageSize) return;
          const current = touchMetrics(event);
          const start = gestureStart.current;
          if (!start || start.count !== current.count) {
            gestureStart.current = gestureSnapshot(
              event,
              zoomRef.current,
              offsetRef.current,
              stageSize,
              start?.stageCenter,
            );
            return;
          }

          const nextZoom =
            current.count > 1 && start.distance > 0
              ? boundedZoom(start.zoom * (current.distance / start.distance))
              : start.zoom;
          const startGeometry = imageGeometry(imageSize, cropSize, start.zoom);
          const nextGeometry = imageGeometry(imageSize, cropSize, nextZoom);
          const imagePoint = {
            x:
              (start.midpoint.x - start.stageCenter.x - start.offset.x) /
              startGeometry.scale,
            y:
              (start.midpoint.y - start.stageCenter.y - start.offset.y) /
              startGeometry.scale,
          };
          const nextOffset = clampOffset(
            {
              x:
                current.midpoint.x -
                start.stageCenter.x -
                imagePoint.x * nextGeometry.scale,
              y:
                current.midpoint.y -
                start.stageCenter.y -
                imagePoint.y * nextGeometry.scale,
            },
            nextGeometry,
          );
          zoomRef.current = nextZoom;
          offsetRef.current = nextOffset;
          setZoom(nextZoom);
          setOffset(nextOffset);
        },
        onPanResponderRelease: () => {
          gestureStart.current = undefined;
        },
        onPanResponderTerminate: () => {
          gestureStart.current = undefined;
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [cropSize, imageSize, stageSize],
  );

  React.useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  React.useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const applyCrop = async () => {
    if (!imageSize || !geometry || busy) return;
    setBusy(true);
    setError(undefined);
    const sourceCropSize = cropSize / geometry.scale;
    const originX =
      (imageSize.width - sourceCropSize) / 2 - offset.x / geometry.scale;
    const originY =
      (imageSize.height - sourceCropSize) / 2 - offset.y / geometry.scale;
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: Math.max(0, originX),
              originY: Math.max(0, originY),
              width: sourceCropSize,
              height: sourceCropSize,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (mountedRef.current) onComplete(result.uri);
    } catch {
      if (mountedRef.current) {
        setError('Could not crop this photo. Please try another image.');
        setBusy(false);
      }
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={busy ? () => undefined : onCancel}
    >
      <SafeAreaProvider testID="profile-photo-crop-safe-area-provider">
        <Screen>
          <AppHeader
            title="Crop profile photo"
            eyebrow="Fit your photo"
            onBack={busy ? undefined : onCancel}
          />
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
            }}
          >
            <AppText color="muted" style={{ textAlign: 'center' }}>
              Drag the photo to reposition it. Pinch the image to zoom.
            </AppText>
            <View
              style={{
                width: stageSize,
                height: stageSize,
                overflow: 'hidden',
                backgroundColor: theme.colors.imageCropBackground,
              }}
            >
              {geometry ? (
                <Image
                  source={{ uri }}
                  resizeMode="stretch"
                  style={{
                    position: 'absolute',
                    width: geometry.width,
                    height: geometry.height,
                    left: (stageSize - geometry.width) / 2 + offset.x,
                    top: (stageSize - geometry.height) / 2 + offset.y,
                  }}
                />
              ) : null}
              <View
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  width: cropSize + stageSize * 2,
                  height: cropSize + stageSize * 2,
                  left: CROP_INSET - stageSize,
                  top: CROP_INSET - stageSize,
                  borderWidth: stageSize,
                  borderRadius: cropSize / 2 + stageSize,
                  borderColor: theme.colors.imageCropMask,
                }}
              />
              <View
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  width: cropSize,
                  height: cropSize,
                  left: CROP_INSET,
                  top: CROP_INSET,
                  borderRadius: cropSize / 2,
                  borderWidth: 2,
                  borderColor: theme.colors.imageCropGuide,
                }}
              />
              <View
                accessibilityLabel="Circular profile photo crop area"
                accessibilityHint="Drag to reposition the photo and pinch to zoom"
                {...panResponder.panHandlers}
                style={StyleSheet.absoluteFill}
              />
            </View>
            {error ? (
              <AppText
                color="danger"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {error}
              </AppText>
            ) : null}
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <Button
                label="Cancel"
                variant="secondary"
                disabled={busy}
                onPress={onCancel}
              />
              <Button
                label="Use photo"
                icon="checkmark"
                loading={busy}
                loadingLabel="Cropping…"
                disabled={!imageSize}
                onPress={() => void applyCrop()}
              />
            </View>
          </View>
        </Screen>
      </SafeAreaProvider>
    </Modal>
  );
};

const imageGeometry = (
  imageSize: ImageSize,
  cropSize: number,
  zoom: number,
) => {
  const scale =
    Math.max(cropSize / imageSize.width, cropSize / imageSize.height) * zoom;
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;
  return {
    scale,
    width,
    height,
    maxX: Math.max(0, (width - cropSize) / 2),
    maxY: Math.max(0, (height - cropSize) / 2),
  };
};

const boundedZoom = (zoom: number) =>
  Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

const clampOffset = (
  offset: Offset,
  geometry: ReturnType<typeof imageGeometry>,
): Offset => ({
  x: Math.max(-geometry.maxX, Math.min(geometry.maxX, offset.x)),
  y: Math.max(-geometry.maxY, Math.min(geometry.maxY, offset.y)),
});

const touchMetrics = (event: GestureResponderEvent): TouchMetrics => {
  const touches = eventTouches(event);
  const first = touches[0] ?? event.nativeEvent;
  const second = touches[1];
  const midpoint = second
    ? {
        x: (first.pageX + second.pageX) / 2,
        y: (first.pageY + second.pageY) / 2,
      }
    : { x: first.pageX, y: first.pageY };
  return {
    count: second ? 2 : 1,
    midpoint,
    distance: second ? touchDistance(first, second) : 0,
  };
};

const gestureSnapshot = (
  event: GestureResponderEvent,
  zoom: number,
  offset: Offset,
  stageSize: number,
  previousStageCenter?: Offset,
): GestureSnapshot => {
  const metrics = touchMetrics(event);
  const local = localTouchMidpoint(event);
  return {
    ...metrics,
    zoom,
    offset,
    stageCenter: previousStageCenter ?? {
      x: metrics.midpoint.x - local.x + stageSize / 2,
      y: metrics.midpoint.y - local.y + stageSize / 2,
    },
  };
};

const eventTouches = (event: GestureResponderEvent) =>
  event.nativeEvent.touches.length
    ? event.nativeEvent.touches
    : event.nativeEvent.changedTouches;

const localTouchMidpoint = (event: GestureResponderEvent): Offset => {
  const touches = eventTouches(event);
  const first = touches[0] ?? event.nativeEvent;
  const second = touches[1];
  return second
    ? {
        x: (first.locationX + second.locationX) / 2,
        y: (first.locationY + second.locationY) / 2,
      }
    : { x: first.locationX, y: first.locationY };
};

const touchDistance = (first: NativeTouchEvent, second: NativeTouchEvent) =>
  Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
