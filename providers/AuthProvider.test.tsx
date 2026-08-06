import React from 'react';
import { Text } from 'react-native';

import { act, render, screen, waitFor } from '@testing-library/react-native';

import { Role, User, parseUser } from '../core/domain';
import { AuthProvider, useAuth } from './AuthProvider';

const mockRestore = jest.fn();
const mockObserveCurrentUser = jest.fn();
const mockProfileSync = jest.fn();
let mockProfileListener: ((user: User | undefined) => void) | undefined;

jest.mock('../composition/appModules', () => ({
  appModules: {
    session: {
      restore: (...args: unknown[]) => mockRestore(...args),
      observeCurrentUser: (listener: (user: User | undefined) => void) => {
        mockProfileListener = listener;
        return mockObserveCurrentUser(listener);
      },
    },
    profiles: {
      sync: (...args: unknown[]) => mockProfileSync(...args),
    },
  },
}));

const president = parseUser({
  id: 'will-1',
  email: 'Willhakins@gmail.com',
  role: Role.President,
});
const developer = parseUser({ ...president, role: Role.Developer });

const AuthProbe = () => {
  const { user, loading } = useAuth();
  return <Text>{loading ? 'loading' : `${user.email}:${user.role}`}</Text>;
};

describe('AuthProvider live profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileListener = undefined;
    mockRestore.mockResolvedValue({ ok: true, value: president, warnings: [] });
    mockObserveCurrentUser.mockReturnValue(jest.fn());
    mockProfileSync.mockResolvedValue({ ok: true, value: {}, warnings: [] });
  });

  it('replaces a stale role when the signed-in profile changes', async () => {
    await render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('Willhakins@gmail.com:3')).toBeOnTheScreen();
    expect(mockObserveCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockProfileSync).toHaveBeenCalledWith(president);
    await act(() => mockProfileListener?.(developer));
    await waitFor(() =>
      expect(screen.getByText('Willhakins@gmail.com:4')).toBeOnTheScreen(),
    );
  });

  it('does not let a slower session restore overwrite a live developer profile', async () => {
    let resolveRestore: ((value: unknown) => void) | undefined;
    mockRestore.mockReturnValue(new Promise((resolve) => {
      resolveRestore = resolve;
    }));

    await render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(() => mockProfileListener?.(developer));
    expect(screen.getByText('Willhakins@gmail.com:4')).toBeOnTheScreen();

    await act(() => resolveRestore?.({ ok: true, value: president, warnings: [] }));
    expect(screen.getByText('Willhakins@gmail.com:4')).toBeOnTheScreen();
  });
});
