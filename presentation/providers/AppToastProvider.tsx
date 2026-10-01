import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePathname } from 'expo-router';

import { SuccessToast } from '@/presentation/ui';

interface QueuedToast {
  readonly id: number;
  readonly message: string;
  readonly sourcePathname: string;
}

interface AppToastContextValue {
  readonly queueSuccessToast: (message: string) => void;
}

const AppToastContext = createContext<AppToastContextValue>({
  queueSuccessToast: () => undefined,
});

export const useAppToast = () => useContext(AppToastContext);

export const AppToastProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const pathname = usePathname();
  const nextId = useRef(0);
  const [queuedToast, setQueuedToast] = useState<QueuedToast>();
  const [visibleToast, setVisibleToast] = useState<QueuedToast>();

  const queueSuccessToast = useCallback(
    (message: string) => {
      nextId.current += 1;
      setQueuedToast({
        id: nextId.current,
        message,
        sourcePathname: pathname,
      });
    },
    [pathname],
  );

  useEffect(() => {
    if (!queuedToast || queuedToast.sourcePathname === pathname) return;
    setVisibleToast(queuedToast);
    setQueuedToast(undefined);
  }, [pathname, queuedToast]);

  const value = useMemo(
    () => ({ queueSuccessToast }),
    [queueSuccessToast],
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}
      {visibleToast ? (
        <SuccessToast
          key={visibleToast.id}
          message={visibleToast.message}
          onDismiss={() =>
            setVisibleToast((current) =>
              current?.id === visibleToast.id ? undefined : current,
            )
          }
        />
      ) : null}
    </AppToastContext.Provider>
  );
};
