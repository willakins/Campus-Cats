import React, { useState } from 'react';
import { View } from 'react-native';

import { AccessBanner, Dialog, IconButton } from '@/components/design';
import {
  Role,
  RoleAccessPolicy,
  roleAccessRequirement,
} from '@/core/domain';

interface AccessPresentation {
  readonly accessLabel: string;
  readonly title: string;
  readonly message: string;
  readonly indicator:
    | { readonly icon: 'shield-checkmark-outline' }
    | { readonly symbol: '👑' | '</>' };
}

type AccessContext = 'page' | 'action';

const levelPresentation = (
  minimumRole: Role,
  context: AccessContext,
) => {
  if (minimumRole >= Role.Developer) {
    return {
      accessLabel: 'developer-only',
      title: `Developer-only ${context}`,
      indicator: { symbol: '</>' } as const,
    };
  }
  if (minimumRole >= Role.President) {
    return {
      accessLabel: 'president-level',
      title: `President-level ${context}`,
      indicator: { symbol: '👑' } as const,
    };
  }
  if (minimumRole >= Role.VicePresident) {
    return {
      accessLabel: 'vice-president-level',
      title: `Vice President-level ${context}`,
      indicator: { icon: 'shield-checkmark-outline' } as const,
    };
  }
  return {
    accessLabel: 'officer-only',
    title: `Officer-only ${context}`,
    indicator: { icon: 'shield-checkmark-outline' } as const,
  };
};

export const roleAccessPresentation = (
  policy: RoleAccessPolicy,
  context: AccessContext = 'page',
): AccessPresentation => {
  const presentation = levelPresentation(policy.minimumRole, context);
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
  context = 'page',
}: {
  readonly policy: RoleAccessPolicy;
  readonly context?: AccessContext;
}) => {
  const [open, setOpen] = useState(false);
  const { accessLabel, title, message, indicator } =
    roleAccessPresentation(policy, context);
  const closeLabel = `Hide ${accessLabel} explanation`;

  if (policy.minimumRole <= Role.Member) return null;

  return (
    <>
      {!open ? (
        <IconButton
          {...indicator}
          accessibilityLabel={`Explain ${accessLabel} access`}
          onPress={() => setOpen(true)}
        />
      ) : null}
      <Dialog
        visible={open}
        closeLabel={`Close ${accessLabel} explanation popup`}
        contentStyle={{ padding: 0 }}
        onClose={() => setOpen(false)}
      >
        <View>
            <AccessBanner
              title={title}
              message={message}
              dismissLabel={closeLabel}
              onDismiss={() => setOpen(false)}
            />
        </View>
      </Dialog>
    </>
  );
};

export interface RoleAccessRequirement {
  readonly policy: RoleAccessPolicy;
  readonly role: Role;
}
