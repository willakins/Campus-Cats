import React from 'react';

import { render } from '@testing-library/react-native';

import App from '../../app/index';
import type { UniversitySearchResult } from '../../core/domain';

const mockRedirect = jest.fn((_props: { readonly href: string }) => null);
let mockUniversity: UniversitySearchResult | undefined;

jest.mock('expo-router', () => ({
  Redirect: (props: { readonly href: string }) => mockRedirect(props),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  setOptions: jest.fn(),
  hide: jest.fn(),
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({ currentUser: undefined, loading: false }),
  useClub: () => ({ access: undefined, loading: false }),
  useUniversitySelection: () => ({
    university: mockUniversity,
    loading: false,
  }),
}));

const university = (
  status: UniversitySearchResult['status'],
): UniversitySearchResult => ({
  id: '139658',
  name: 'Emory University',
  city: 'Atlanta',
  state: 'GA',
  emailDomains: ['emory.edu'],
  timezone: 'America/New_York',
  status,
  ...(status === 'mapped'
    ? {
        club: {
          id: 'club-139658',
          name: 'Emory Campus Cats',
          emailEnabled: true,
        },
      }
    : {}),
});

describe('first-launch routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUniversity = undefined;
  });

  it.each([
    ['a first launch', undefined, '/university-search'],
    ['a mapped saved selection', university('mapped'), '/login'],
    ['a pending saved selection', university('pending'), '/club-setup/pending'],
    ['an unclaimed saved selection', university('unclaimed'), '/club-setup'],
  ])('routes %s', async (_label, selected, expected) => {
    mockUniversity = selected;

    await render(<App />);

    expect(mockRedirect).toHaveBeenLastCalledWith(
      expect.objectContaining({ href: expected }),
    );
  });
});
