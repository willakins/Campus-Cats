import React from 'react';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import CreateStation from '../../app/(app)/stations/create-station';
import { AppThemeProvider } from '../../theme';

const mockCreate = jest.fn();
const mockScrollTo = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/design', () => {
  const actual = jest.requireActual('../../components/design');
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    ...actual,
    Screen: ({
      children,
      footer,
      scrollRef,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
      scrollRef?: {
        current: { scrollTo: (options: unknown) => void } | null;
      };
    }) => {
      ReactRuntime.useEffect(() => {
        if (!scrollRef) return undefined;
        scrollRef.current = { scrollTo: mockScrollTo };
        return () => {
          scrollRef.current = null;
        };
      }, [scrollRef]);
      return ReactRuntime.createElement(NativeView, null, children, footer);
    },
  };
});
jest.mock('../../composition/appModules', () => ({
  appModules: {
    stations: { create: (...args: unknown[]) => mockCreate(...args) },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));
jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));

describe('create station route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks every missing required field, scrolls to the first one, and shows guidance', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateStation />
      </AppThemeProvider>,
    );

    const layout = (y: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 320, height: 48 } },
    });
    await fireEvent(screen.getByTestId('form-screen-content'), 'layout', layout(100));
    await fireEvent(screen.getByTestId('station-section-basics'), 'layout', layout(200));
    await fireEvent(screen.getByTestId('station-field-name'), 'layout', layout(30));
    await fireEvent.changeText(
      screen.getByLabelText('Restocking frequency in days'),
      '',
    );

    await user.press(screen.getByRole('button', { name: 'Create Station' }));

    expect(await screen.findByText('Station name is required.')).toBeOnTheScreen();
    expect(screen.getByText('Station location is required.')).toBeOnTheScreen();
    expect(screen.getByText('Restocking frequency is required.')).toBeOnTheScreen();
    expect(screen.getByText('At least one photo is required.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Station name')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(screen.getByLabelText('Station location field')).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
    });
    expect(screen.getByLabelText('Photos field')).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockCreate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Station name'), 'Library');
    await waitFor(() =>
      expect(screen.queryByText('Station name is required.')).not.toBeOnTheScreen(),
    );
  });
});
