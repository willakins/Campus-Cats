import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AccessBanner, IconButton } from '@/components/design';
import {
  Role,
  RoleAccessPolicy,
  roleAccessRequirement,
} from '@/core/domain';
import { useAppTheme } from '@/theme';

interface AccessPresentation {
  readonly accessLabel: string;
  readonly title: string;
  readonly message: string;
}

const levelPresentation = (minimumRole: Role) => {
  if (minimumRole >= Role.Developer) {
    return { accessLabel: 'developer-only', title: 'Developer-only page' };
  }
  if (minimumRole >= Role.President) {
    return { accessLabel: 'president-level', title: 'President-level page' };
  }
  if (minimumRole >= Role.VicePresident) {
    return {
      accessLabel: 'vice-president-level',
      title: 'Vice President-level page',
    };
  }
  return { accessLabel: 'officer-only', title: 'Officer-only page' };
};

export const roleAccessPresentation = (
  policy: RoleAccessPolicy,
): AccessPresentation => {
  const presentation = levelPresentation(policy.minimumRole);
  const requirement = `${roleAccessRequirement(policy)}.`;
  return {
    ...presentation,
    message: policy.publicContext
      ? `${policy.publicContext} ${requirement}`
      : requirement,
  };
};

export const RestrictedAccess = ({
  policy,
}: {
  readonly policy: RoleAccessPolicy;
}) => {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const { accessLabel, title, message } = roleAccessPresentation(policy);
  const closeLabel = `Hide ${accessLabel} explanation`;

  if (policy.minimumRole <= Role.Member) return null;

  return (
    <>
      {!open ? (
        <IconButton
          icon="shield-checkmark-outline"
          accessibilityLabel={`Explain ${accessLabel} access`}
          onPress={() => setOpen(true)}
        />
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.layout.screenGutter,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close ${accessLabel} explanation popup`}
            onPress={() => setOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: theme.colors.overlay,
            }}
          />
          <View style={{ width: '100%', maxWidth: 420 }}>
            <AccessBanner
              title={title}
              message={message}
              dismissLabel={closeLabel}
              onDismiss={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export interface RoleAccessRequirement {
  readonly policy: RoleAccessPolicy;
  readonly role: Role;
}
