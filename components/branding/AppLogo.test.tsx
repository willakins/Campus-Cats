import React from 'react';

import { render, screen } from '@testing-library/react-native';

import { AppLogo } from './AppLogo';

let mockLogoUrl = '';

jest.mock('../../providers/AppSettingsContext', () => ({
  useAppSettings: () => ({ settings: { logoUrl: mockLogoUrl } }),
}));

describe('AppLogo', () => {
  beforeEach(() => {
    mockLogoUrl = '';
  });

  it('uses the separate bundled app logo when club branding has not been published', async () => {
    await render(<AppLogo />);

    expect(screen.getByLabelText('Campus Cats club logo').props.source).toBeTruthy();
    expect(screen.getByLabelText('Campus Cats club logo').props.source).not.toEqual({
      uri: '',
    });
  });

  it('uses the database club logo as the in-app brand mark', async () => {
    mockLogoUrl = 'https://cdn.example.com/club-logo.png';

    await render(<AppLogo />);

    expect(screen.getByLabelText('Campus Cats club logo').props.source).toEqual({
      uri: mockLogoUrl,
    });
  });
});
