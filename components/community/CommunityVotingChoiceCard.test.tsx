import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { CommunityVotingChoiceCard } from './CommunityVotingChoiceCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('CommunityVotingChoiceCard', () => {
  it('opens a nominee profile separately from selecting the ballot choice', async () => {
    const user = userEvent.setup();
    const viewProfile = jest.fn();
    const select = jest.fn();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommunityVotingChoiceCard
          choice={{
            id: 'member-1',
            label: 'Alex',
            pitch: 'I will organize dependable volunteer schedules.',
            profileUserId: 'member-1',
          }}
          selected={false}
          onProfilePress={viewProfile}
          onSelect={select}
        />
      </AppThemeProvider>,
    );

    expect(
      screen.getByText('I will organize dependable volunteer schedules.'),
    ).toBeOnTheScreen();
    const profileButton = screen.getByRole('button', {
      name: "View Alex's profile",
    });
    const chooseButton = screen.getByRole('button', { name: 'Choose Alex' });
    const chooseAncestors = [];
    for (let ancestor = chooseButton.parent; ancestor; ancestor = ancestor.parent) {
      chooseAncestors.push(ancestor);
    }
    expect(chooseAncestors).not.toContain(profileButton);

    await user.press(profileButton);
    expect(viewProfile).toHaveBeenCalledWith('member-1');
    expect(select).not.toHaveBeenCalled();

    await user.press(chooseButton);
    expect(select).toHaveBeenCalledWith('member-1');
  });
});
