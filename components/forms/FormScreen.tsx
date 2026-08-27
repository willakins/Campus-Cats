import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { canAccessRolePolicy } from '../../core/domain';
import { useAppTheme } from '../../theme';
import {
  RestrictedAccess,
  RoleAccessRequirement,
  roleAccessPresentation,
} from '../access';
import {
  AccessDeniedState,
  AppHeader,
  Button,
  FeedbackBanner,
  FormSection,
  Screen,
  Toast,
} from '../design';

export interface FormScrollRequest {
  readonly id: number;
  readonly y: number;
}

export interface FormToastMessage {
  readonly id: number;
  readonly message: string;
}

interface FormScreenProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly headerAction?: React.ReactNode;
  readonly access?: RoleAccessRequirement;
  readonly saveLabel: string;
  readonly savingLabel: string;
  readonly busy: boolean;
  readonly saveDisabled?: boolean;
  readonly error?: string;
  readonly scrollRequest?: FormScrollRequest;
  readonly toast?: FormToastMessage;
  readonly onBack: () => void;
  readonly onSave: () => void;
  readonly onDelete?: () => void;
  readonly deleteLabel?: string;
  readonly children: React.ReactNode;
}

export const FormScreen = ({
  title,
  eyebrow,
  headerAction,
  access,
  saveLabel,
  savingLabel,
  busy,
  saveDisabled,
  error,
  scrollRequest,
  toast,
  onBack,
  onSave,
  onDelete,
  deleteLabel,
  children,
}: FormScreenProps) => {
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [formTop, setFormTop] = useState(0);
  useEffect(() => {
    if (!scrollRequest) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, formTop + scrollRequest.y - theme.spacing.sm),
      animated: true,
    });
  }, [formTop, scrollRequest, theme.spacing.sm]);
  const accessAction = access ? (
    <RestrictedAccess policy={access.policy} />
  ) : (
    headerAction
  );
  if (access && !canAccessRolePolicy(access.role, access.policy)) {
    return (
      <Screen>
        <AppHeader
          title={title}
          eyebrow={eyebrow}
          action={accessAction}
          onBack={onBack}
        />
        <AccessDeniedState
          message={roleAccessPresentation(access.policy).message}
        />
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        scrollRef={scrollRef}
        keyboardAware
        footer={(
          <Button
            label={saveLabel}
            fullWidth
            disabled={saveDisabled}
            loading={busy}
            loadingLabel={savingLabel}
            onPress={onSave}
          />
        )}
      >
        <AppHeader
          title={title}
          eyebrow={eyebrow}
          action={accessAction}
          onBack={onBack}
        />
        <View
          testID="form-screen-content"
          onLayout={({ nativeEvent }) => setFormTop(nativeEvent.layout.y)}
          style={{ gap: theme.spacing.lg }}
        >
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          {children}
          {onDelete && deleteLabel ? (
            <FormSection title="Danger zone">
              <Button
                label={deleteLabel}
                variant="danger"
                fullWidth
                disabled={busy}
                onPress={onDelete}
              />
            </FormSection>
          ) : null}
        </View>
      </Screen>
      {toast ? (
        <View
          key={toast.id}
          style={{
            position: 'absolute',
            right: theme.layout.screenGutter,
            bottom: theme.layout.minTouchTarget + theme.spacing.xxl,
            left: theme.layout.screenGutter,
            pointerEvents: 'none',
            alignItems: 'center',
          }}
        >
          <Toast message={toast.message} />
        </View>
      ) : null}
    </View>
  );
};
