import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { ParticipationAudienceOption } from './ParticipationAudienceOption';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('ParticipationAudienceOption', () => {
  it('lets creators choose between all members and officers only', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(
      <AppThemeProvider colorScheme="light">
        <ParticipationAudienceOption
          value="all_members"
          onChange={onChange}
        />
      </AppThemeProvider>,
    );

    expect(screen.getByText('Who can participate?')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Officers only' }),
    );
    expect(onChange).toHaveBeenCalledWith('officers_only');
  });
});
