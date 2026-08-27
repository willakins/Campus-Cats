import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EmojiKeyboard,
  EmojiModal,
  EmojiType,
} from '@softwhere-uz/react-native-emoji-keyboard';

import { useAppTheme } from '@/theme';

export const ChatEmojiPickerModal = ({
  open,
  onClose,
  onSelect,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSelect: (emoji: string) => void;
}) => {
  const theme = useAppTheme();
  const pickerTheme = {
    backdrop: theme.colors.overlay,
    container: theme.colors.surface,
    header: theme.colors.text,
    category: {
      icon: theme.colors.textMuted,
      iconActive: theme.colors.primary,
      container: theme.colors.surfaceSubtle,
      containerActive: theme.colors.primarySurface,
    },
    search: {
      background: theme.colors.surfaceSubtle,
      text: theme.colors.text,
      placeholder: theme.colors.textMuted,
      icon: theme.colors.textMuted,
    },
    emoji: { selected: theme.colors.primarySurface },
  };
  return (
    <EmojiModal
      open={open}
      onClose={onClose}
      height="70%"
      colorScheme={theme.dark ? 'dark' : 'light'}
      theme={pickerTheme}
    >
      <EmojiKeyboard
        onEmojiSelected={(selection: EmojiType) => onSelect(selection.emoji)}
        defaultHeight="100%"
        enableSearchBar
        searchDebounceMs={150}
        enableRecentlyUsed
        enablePreview
        storage={AsyncStorage}
        colorScheme={theme.dark ? 'dark' : 'light'}
        theme={pickerTheme}
      />
    </EmojiModal>
  );
};
