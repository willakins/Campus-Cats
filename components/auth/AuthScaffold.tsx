import React from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppLogo } from '../branding';
import { FormTextInput } from '../forms';
import { AppHeader, AppText, Card, Screen } from '../design';

interface AuthScaffoldProps {
  readonly title: string;
  readonly subtitle: string;
  readonly onBack?: () => void;
  readonly children: React.ReactNode;
}

export const AuthScaffold = ({ title, subtitle, onBack, children }: AuthScaffoldProps) => {
  const theme = useAppTheme();
  return (
    <Screen scroll keyboardAware contentStyle={{ paddingBottom: theme.spacing.huge }}>
      {onBack ? <AppHeader title={title} eyebrow="Account access" onBack={onBack} /> : null}
      <View
        style={{
          width: '100%',
          maxWidth: theme.layout.maxAuthWidth,
          alignSelf: 'center',
          gap: theme.spacing.lg,
          paddingTop: onBack ? 0 : theme.spacing.xl,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
            borderRadius: theme.radii.sheet,
            backgroundColor: theme.colors.goldSurface,
          }}
        >
          <AppLogo
            accessibilityLabel="Campus Cats logo"
            style={{ width: '100%', height: 152 }}
          />
          {!onBack ? (
            <AppText variant="display" style={{ textAlign: 'center' }}>
              {title}
            </AppText>
          ) : null}
          <AppText color="muted" style={{ textAlign: 'center' }}>
            {subtitle}
          </AppText>
        </View>
        <Card style={{ gap: theme.spacing.md }}>{children}</Card>
      </View>
    </Screen>
  );
};

export const AuthTextField = FormTextInput;
