import React from 'react';
import { Text } from 'react-native';

import { render, screen, userEvent } from '@testing-library/react-native';

import { Role, RoleAccessPolicy } from '../../core/domain';
import { AppThemeProvider } from '../../theme';
import { RestrictedScreen } from './RestrictedScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const officerPolicy: RoleAccessPolicy = {
  minimumRole: Role.Officer,
  capability: 'manage test records',
};

const renderScreen = async (policy: RoleAccessPolicy, role: Role) =>
  await render(
    <AppThemeProvider colorScheme="light">
      <RestrictedScreen
        title="Restricted records"
        onBack={jest.fn()}
        access={{ policy, role }}
      >
        <Text>Protected content</Text>
      </RestrictedScreen>
    </AppThemeProvider>,
  );

describe('policy-driven restricted screens', () => {
  it('derives the guard, shield, and explanation from one policy', async () => {
    const user = userEvent.setup();
    const view = await renderScreen(officerPolicy, Role.Officer);

    expect(screen.getByText('Protected content')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    ).toBeOnTheScreen();

    const presidentPolicy: RoleAccessPolicy = {
      ...officerPolicy,
      minimumRole: Role.President,
    };
    await view.rerender(
      <AppThemeProvider colorScheme="light">
        <RestrictedScreen
          title="Restricted records"
          onBack={jest.fn()}
          access={{ policy: presidentPolicy, role: Role.Officer }}
        >
          <Text>Protected content</Text>
        </RestrictedScreen>
      </AppThemeProvider>,
    );

    expect(screen.queryByText('Protected content')).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        'President-level access is required to manage test records.',
      ),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Explain president-level access' }),
    );
    expect(screen.getByText('President-level page')).toBeOnTheScreen();
  });
});
