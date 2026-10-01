import React, { useLayoutEffect, useRef } from 'react';

import { useAppTheme } from '@/theme';

type DateTimeInputProps = {
  date: Date;
  maximumDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  setDate: (date: Date) => void;
};

const dateInputValue = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  maximumDate,
  open = false,
  onOpenChange,
  setDate,
}) => {
  const theme = useAppTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const input = inputRef.current;
    input?.focus();
    if (input?.showPicker) {
      try {
        input.showPicker();
      } catch {
        input.click();
      }
    } else {
      input?.click();
    }
    onOpenChange?.(false);
  }, [onOpenChange, open]);
  const changeDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return;
    setDate(
      new Date(
        year,
        month - 1,
        day,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
      ),
    );
  };

  return (
    <input
      ref={inputRef}
      aria-label={`Choose date, current date ${date.toDateString()}`}
      type="date"
      value={dateInputValue(date)}
      max={maximumDate ? dateInputValue(maximumDate) : undefined}
      onChange={(event) => changeDate(event.currentTarget.value)}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        minHeight: theme.layout.minTouchTarget,
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radii.field,
        background: theme.colors.surface,
        color: theme.colors.text,
        colorScheme: theme.dark ? 'dark' : 'light',
        fontSize: theme.typography.body.fontSize,
        lineHeight: `${theme.typography.body.lineHeight}px`,
      }}
    />
  );
};
