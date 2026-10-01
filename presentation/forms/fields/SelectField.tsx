import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, FormField } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

import { SelectFieldState } from '../SelectFieldState';

interface SelectFieldProps<Value extends string> {
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly picker: SelectFieldState<Value>;
  readonly placeholder: string;
}

interface SelectAnchor {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const MAX_SELECT_POPUP_HEIGHT = 280;
const MIN_SELECT_POPUP_WIDTH = 220;

export const SelectField = <Value extends string>({
  label,
  required,
  error,
  picker,
  placeholder,
}: SelectFieldProps<Value>) => {
  const theme = useAppTheme();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor>();
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const selectedItem = picker.items.find(({ value }) => value === picker.value);
  const gutter = theme.layout.screenGutter;
  const availableWidth = Math.max(0, viewportWidth - gutter * 2);
  const popupHeight = Math.min(
    picker.items.length * theme.layout.minTouchTarget + 2,
    MAX_SELECT_POPUP_HEIGHT,
    Math.max(theme.layout.minTouchTarget, viewportHeight - gutter * 2),
  );
  const fallbackAnchor: SelectAnchor = {
    x: gutter,
    y: Math.max(gutter, (viewportHeight - popupHeight) / 2),
    width: availableWidth,
    height: 0,
  };
  const resolvedAnchor = anchor ?? fallbackAnchor;
  const popupWidth = Math.min(
    Math.max(resolvedAnchor.width, MIN_SELECT_POPUP_WIDTH),
    availableWidth,
  );
  const popupLeft = Math.max(
    gutter,
    Math.min(resolvedAnchor.x, viewportWidth - popupWidth - gutter),
  );
  const popupBelow =
    resolvedAnchor.y + resolvedAnchor.height + theme.spacing.xxs;
  const popupTop =
    popupBelow + popupHeight <= viewportHeight - gutter
      ? popupBelow
      : Math.max(gutter, resolvedAnchor.y - popupHeight - theme.spacing.xxs);

  const measureTrigger = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setAnchor({ x, y, width, height });
    });
  };

  const closeOptions = () => picker.setOpen(false);

  const toggleOptions = () => {
    if (picker.open) {
      closeOptions();
      return;
    }
    measureTrigger();
    picker.setOpen(true);
  };

  return (
    <FormField label={label} required={required} error={error}>
      <View ref={triggerRef} collapsable={false} onLayout={measureTrigger}>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ expanded: picker.open }}
          accessibilityValue={{ text: selectedItem?.label ?? placeholder }}
          onPress={toggleOptions}
          style={({ pressed }) => ({
            minHeight: theme.layout.minTouchTarget,
            paddingHorizontal: theme.spacing.sm,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.surface,
            opacity: pressed ? 0.8 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.sm,
          })}
        >
          <AppText
            numberOfLines={1}
            style={{
              flex: 1,
              color: selectedItem ? theme.colors.text : theme.colors.textMuted,
            }}
          >
            {selectedItem?.label ?? placeholder}
          </AppText>
          <Ionicons
            name={picker.open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>
      {picker.open ? (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={closeOptions}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              accessibilityLabel={`Close ${label} options`}
              onPress={closeOptions}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View
              accessibilityLabel={`${label} options`}
              accessibilityRole="menu"
              accessibilityViewIsModal
              style={[
                theme.elevation.floating,
                {
                  position: 'absolute',
                  top: popupTop,
                  left: popupLeft,
                  width: popupWidth,
                  maxHeight: popupHeight,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.field,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                {picker.items.map((item, index) => {
                  const selected = item.value === picker.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityLabel={`Select ${item.label}`}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        picker.setValue(item.value as Value);
                        closeOptions();
                      }}
                      style={({ pressed }) => ({
                        minHeight: theme.layout.minTouchTarget,
                        paddingHorizontal: theme.spacing.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: theme.spacing.sm,
                        borderBottomWidth:
                          index === picker.items.length - 1 ? 0 : 1,
                        borderBottomColor: theme.colors.border,
                        backgroundColor:
                          selected || pressed
                            ? theme.colors.primarySurface
                            : theme.colors.surface,
                      })}
                    >
                      <AppText
                        style={{
                          flex: 1,
                          color: selected
                            ? theme.colors.primary
                            : theme.colors.text,
                        }}
                      >
                        {item.label}
                      </AppText>
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={theme.colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </FormField>
  );
};
