import React from 'react';
import { Alert } from 'react-native';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import CreateSighting from '../../app/(app)/sighting/create-sighting';
import { CatalogRecord } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockCatalogList = jest.fn();
const mockCreateSighting = jest.fn();
const mockSyncProfile = jest.fn();
const mockReplace = jest.fn();
const mockTakePhoto = jest.fn();
const mockPickFromLibrary = jest.fn();
const mockScrollTo = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
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
      return ReactRuntime.createElement(
        NativeView,
        { testID: 'mock-form-screen' },
        children,
        footer,
      );
    },
  };
});
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => ReactRuntime.createElement(NativeView, props),
  };
});
jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'member-1', email: 'member@gatech.edu', role: 0 },
  }),
}));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalog: {
      list: (...args: unknown[]) => mockCatalogList(...args),
      media: jest.fn(),
    },
    sightings: {
      create: (...args: unknown[]) => mockCreateSighting(...args),
    },
    profiles: {
      sync: (...args: unknown[]) => mockSyncProfile(...args),
    },
    imageSelection: {
      takePhoto: (...args: unknown[]) => mockTakePhoto(...args),
      pickFromLibrary: (...args: unknown[]) => mockPickFromLibrary(...args),
    },
  },
}));

const goldie: CatalogRecord = {
  source: 'inaturalist',
  id: 'catalog-goldie',
  sourceId: 101,
  cat: { name: 'Goldie', descShort: 'Friendly orange tabby near the library.' },
  credits: '',
  sourceUrl: 'https://example.com/catalog-goldie',
  sourceUpdatedAt: new Date('2026-08-20T12:00:00.000Z'),
  matchStatus: 'unlinked',
  sourceActive: true,
  visible: true,
  moderation: { hidden: false, reason: '' },
};

const completeRequiredSightingFields = async (
  user: ReturnType<typeof userEvent.setup>,
  { fillName = true }: { fillName?: boolean } = {},
) => {
  if (fillName) {
    fireEvent.changeText(screen.getByLabelText('Cat name'), 'Mimi');
  }

  await user.press(screen.getByRole('button', { name: 'Time of sighting' }));
  await user.press(await screen.findByLabelText('Select Morning'));
  fireEvent(
    screen.getByLabelText('Sighting location'),
    'regionChangeComplete',
    {
      latitude: 33.772,
      longitude: -84.394,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
  );

  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await user.press(screen.getByRole('button', { name: 'Add photos' }));
  const chooseFromLibrary = alert.mock.calls
    .at(-1)?.[2]
    ?.find(({ text }) => text === 'Choose from library');
  chooseFromLibrary?.onPress?.();
  await waitFor(() => expect(screen.getByLabelText('Photo 1')).toBeOnTheScreen());
  alert.mockRestore();
};

describe('create sighting route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatalogList.mockResolvedValue({ ok: true, value: [goldie], warnings: [] });
    mockCreateSighting.mockResolvedValue({
      ok: true,
      value: { id: 'sighting-1' },
      warnings: [],
    });
    mockSyncProfile.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockPickFromLibrary.mockResolvedValue({
      ok: true,
      value: { localUri: 'file://sighting.jpg' },
      warnings: [],
    });
  });

  it('loads catalog choices and reports the selected profile name', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateSighting />
      </AppThemeProvider>,
    );

    await waitFor(() => expect(mockCatalogList).toHaveBeenCalledTimes(1));
    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Gol');
    await user.press(
      await screen.findByRole('button', { name: 'Select catalog cat Goldie' }),
    );
    await completeRequiredSightingFields(user, { fillName: false });
    await user.press(screen.getByRole('button', { name: 'Create Report' }));

    await waitFor(() => expect(mockCreateSighting).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'member-1' }),
      expect.objectContaining({ name: 'Goldie' }),
    ));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/sighting/view-sighting',
      params: { id: 'sighting-1' },
    });
  });

  it('avoids redundant field labels inside the photos and notes cards', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateSighting />
      </AppThemeProvider>,
    );

    expect(screen.getAllByText('Photos *')).toHaveLength(1);
    expect(screen.queryByText('Photos')).not.toBeOnTheScreen();
    expect(screen.queryByText('Additional notes')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Additional notes')).toBeOnTheScreen();
  });

  it('lets the reporter change the day of the sighting', async () => {
    const user = userEvent.setup();
    const selectedDate = new Date(2026, 7, 18, 12);
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateSighting />
      </AppThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: /Choose date/ }));
    fireEvent(
      await screen.findByTestId('dateTimePicker'),
      'valueChange',
      { nativeEvent: {} },
      selectedDate,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Tue Aug 18 2026/ }),
      ).toBeOnTheScreen(),
    );
    await completeRequiredSightingFields(user);
    await user.press(screen.getByRole('button', { name: 'Create Report' }));

    await waitFor(() =>
      expect(mockCreateSighting).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'member-1' }),
        expect.objectContaining({ date: selectedDate }),
      ),
    );
  });

  it('does not submit a sighting dated in the future', async () => {
    const user = userEvent.setup();
    const futureDate = new Date(2099, 0, 1, 12);
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateSighting />
      </AppThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: /Choose date/ }));
    fireEvent(
      await screen.findByTestId('dateTimePicker'),
      'valueChange',
      { nativeEvent: {} },
      futureDate,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Thu Jan 01 2099/ }),
      ).toBeOnTheScreen(),
    );
    await user.press(screen.getByRole('button', { name: 'Create Report' }));

    expect(
      await screen.findByText('Sightings cannot be reported for a future date.'),
    ).toBeOnTheScreen();
    expect(mockCreateSighting).not.toHaveBeenCalled();
  });

  it('marks every missing required field and prompts the reporter to complete the form', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateSighting />
      </AppThemeProvider>,
    );

    await user.press(screen.getByRole('button', { name: 'Create Report' }));

    expect(await screen.findByText('Cat name is required.')).toBeOnTheScreen();
    expect(screen.getByText('Time of sighting is required.')).toBeOnTheScreen();
    expect(screen.getByText('Sighting location is required.')).toBeOnTheScreen();
    expect(screen.getByText('At least one photo is required.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cat name')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(screen.getByRole('button', { name: 'Time of sighting' })).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(screen.getByLabelText('Sighting location field')).toHaveStyle({
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
    expect(mockCreateSighting).not.toHaveBeenCalled();
  });

  it('scrolls to the first missing field and keeps required errors in sync', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateSighting />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId('mock-form-screen')).toBeOnTheScreen();

    const layout = (y: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 320, height: 48 } },
    });
    await fireEvent(screen.getByTestId('form-screen-content'), 'layout', layout(100));
    await fireEvent(screen.getByTestId('sighting-section-basics'), 'layout', layout(200));
    await fireEvent(
      screen.getByTestId('sighting-field-timeOfDay'),
      'layout',
      layout(150),
    );
    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Mimi');

    await user.press(screen.getByRole('button', { name: 'Create Report' }));
    expect(await screen.findByText('Time of sighting is required.')).toBeOnTheScreen();

    await waitFor(() =>
      expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 438, animated: true }),
    );

    await fireEvent.changeText(screen.getByLabelText('Cat name'), '   ');
    expect(await screen.findByText('Cat name is required.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Mimi');
    await waitFor(() =>
      expect(screen.queryByText('Cat name is required.')).not.toBeOnTheScreen(),
    );

    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await user.press(screen.getByRole('button', { name: 'Add photos' }));
    alert.mock.calls
      .at(-1)?.[2]
      ?.find(({ text }) => text === 'Choose from library')
      ?.onPress?.();
    await waitFor(() =>
      expect(screen.queryByText('At least one photo is required.')).not.toBeOnTheScreen(),
    );
    alert.mockRestore();

    await user.press(screen.getByRole('button', { name: 'Remove photo 1' }));
    expect(
      await screen.findByText('At least one photo is required.'),
    ).toBeOnTheScreen();
  });
});
