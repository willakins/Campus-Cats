import React from 'react';

import { canAccessRolePolicy } from '@/core/domain';

import { AccessDeniedState, AppHeader, Screen } from '../design';
import {
  RestrictedAccess,
  RoleAccessRequirement,
  roleAccessPresentation,
} from './RestrictedAccess';

interface RestrictedScreenProps
  extends Omit<React.ComponentProps<typeof Screen>, 'children'> {
  readonly title: string;
  readonly eyebrow?: string;
  readonly onBack?: () => void;
  readonly access: RoleAccessRequirement;
  readonly children: React.ReactNode;
}

export const RestrictedScreen = ({
  title,
  eyebrow,
  onBack,
  access,
  children,
  footer,
  floatingAction,
  ...screenProps
}: RestrictedScreenProps) => {
  const authorized = canAccessRolePolicy(access.role, access.policy);
  return (
    <Screen
      {...screenProps}
      footer={authorized ? footer : undefined}
      floatingAction={authorized ? floatingAction : undefined}
    >
      <AppHeader
        title={title}
        eyebrow={eyebrow}
        onBack={onBack}
        action={<RestrictedAccess policy={access.policy} />}
      />
      {authorized ? (
        children
      ) : (
        <AccessDeniedState
          message={roleAccessPresentation(access.policy).message}
        />
      )}
    </Screen>
  );
};
