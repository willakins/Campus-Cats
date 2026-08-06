import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { mediaAssetId } from '../../core/ports';
import { AppThemeProvider } from '../../theme';
import { AppText } from '../design';
import { DetailHero, FieldNoteSection, MetadataRow } from './index';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../ui/MapView', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return { MapView: ({ children }: React.PropsWithChildren) => mockReact.createElement(MockView, null, children) };
});
jest.mock('react-native-maps', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return { Marker: () => mockReact.createElement(MockView) };
});

const media = [
  { id: mediaAssetId('profile.jpg'), url: 'https://example.com/profile.jpg', role: 'profile' as const },
  { id: mediaAssetId('gallery.jpg'), url: 'https://example.com/gallery.jpg', role: 'gallery' as const },
];

describe('detail components', () => {
  it('uses a 4:3 hero and lets users select gallery photos by name', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="dark">
        <DetailHero title="Goldie" media={media} />
      </AppThemeProvider>,
    );

    expect(screen.getByLabelText('Goldie photo 1 of 2')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Show Goldie photo 2' }));
    expect(screen.getByLabelText('Goldie photo 2 of 2')).toBeOnTheScreen();
  });

  it('groups field notes and presents metadata labels with values', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <FieldNoteSection title="Field notes" icon="document-text-outline">
          <MetadataRow label="Area" value="Library" />
          <AppText>Often naps in the afternoon.</AppText>
        </FieldNoteSection>
      </AppThemeProvider>,
    );

    expect(screen.getByText('Field notes')).toBeOnTheScreen();
    expect(screen.getByText('Area')).toBeOnTheScreen();
    expect(screen.getByText('Library')).toBeOnTheScreen();
  });
});
