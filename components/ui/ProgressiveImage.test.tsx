import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { ProgressiveImage } from './ProgressiveImage';

describe('ProgressiveImage', () => {
  it('shows an accessible placeholder until the image finishes loading', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <ProgressiveImage
          uri="https://example.com/goldie.jpg"
          accessibilityLabel="Goldie profile photo"
          style={{ width: 200, height: 150 }}
        />
      </AppThemeProvider>,
    );

    expect(
      screen.getByRole('progressbar', { name: 'Loading Goldie profile photo' }),
    ).toBeOnTheScreen();

    await fireEvent(screen.getByLabelText('Goldie profile photo'), 'load');

    expect(
      screen.queryByRole('progressbar', { name: 'Loading Goldie profile photo' }),
    ).not.toBeOnTheScreen();
  });

  it('keeps image lifecycle callbacks stable after decode updates loading state', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <ProgressiveImage
          uri="https://example.com/goldie.jpg"
          accessibilityLabel="Goldie profile photo"
          style={{ width: 200, height: 150 }}
        />
      </AppThemeProvider>,
    );
    const image = screen.getByLabelText('Goldie profile photo');
    const callbacks = {
      onLoadStart: image.props.onLoadStart,
      onLoad: image.props.onLoad,
      onLoadEnd: image.props.onLoadEnd,
      onError: image.props.onError,
    };

    await fireEvent(image, 'load');

    expect(screen.getByLabelText('Goldie profile photo').props).toMatchObject(
      callbacks,
    );
  });
});
