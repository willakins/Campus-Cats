import { useCallback } from 'react';

import { useFocusEffect } from 'expo-router';

export type FocusTaskActivity = () => boolean;

/** Runs an async refresh while focused and invalidates its result on blur. */
export const useFocusTask = (
  task: (isActive: FocusTaskActivity) => void | Promise<void>,
) => {
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void task(() => active);
      return () => {
        active = false;
      };
    }, [task]),
  );
};
