import React from 'react';
import { Alert, Image, PanResponder, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme';
import { IconButton } from '@/presentation/ui';
import {
  ChoiceField,
  DateField,
  FormTextInput,
  LocationField,
  PhotoField,
  SelectField,
  ToggleField,
} from './index';

const mockTakePhoto = jest.fn();
const mockPickFromLibrary = jest.fn();
const mockManipulate = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulate(...args),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => ReactRuntime.createElement(NativeView, props),
  };
});
jest.mock('@/composition/appModules', () => ({
  appModules: {
    imageSelection: {
      takePhoto: (...args: unknown[]) => mockTakePhoto(...args),
      pickFromLibrary: (...args: unknown[]) => mockPickFromLibrary(...args),
    },
  },
}));

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>
    </SafeAreaProvider>,
  );

describe('form controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManipulate.mockResolvedValue({ uri: 'file://cropped-avatar.jpg' });
  });

  it('keeps labels visible and forwards text changes', async () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await renderThemed(
      <FormTextInput
        label="Cat name"
        required
        helper="Use the name volunteers know."
        value="Goldie"
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );

    expect(screen.getByText('Cat name')).toBeOnTheScreen();
    expect(screen.getByText('Required')).toBeOnTheScreen();
    const input = screen.getByLabelText('Cat name');
    expect(input).toHaveStyle({
      height: 48,
      paddingVertical: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
    });
    expect(input.parent).toHaveStyle({
      minHeight: 44,
      justifyContent: 'center',
    });
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Goldie II');
    await fireEvent(input, 'blur');
    expect(onChangeText).toHaveBeenCalledWith('Goldie II');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('pairs switches with a descriptive label', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <ToggleField
        label="Cat was fed"
        value={false}
        onValueChange={onValueChange}
      />,
    );

    await fireEvent(
      screen.getByRole('switch', { name: 'Cat was fed' }),
      'valueChange',
      true,
    );
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('centralizes checkbox and radio selection semantics', async () => {
    const onCheckboxChange = jest.fn();
    const onRadioChange = jest.fn();
    const onTrailingPress = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <>
        <ChoiceField
          label="Create an alert"
          helper="Tell members that the survey is ready."
          checked={false}
          trailing={
            <IconButton
              icon="information-outline"
              accessibilityLabel="Explain alert access"
              onPress={onTrailingPress}
            />
          }
          onChange={onCheckboxChange}
        />
        <ChoiceField
          kind="radio"
          label="External donation website"
          checked
          onChange={onRadioChange}
        />
      </>,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Create an alert' }),
    ).toHaveProp('accessibilityState', { checked: false });
    expect(
      screen.getByRole('radio', { name: 'External donation website' }),
    ).toHaveProp('accessibilityState', { checked: true });
    expect(
      screen.getByText('Tell members that the survey is ready.'),
    ).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Explain alert access' }),
    );
    expect(onTrailingPress).toHaveBeenCalledTimes(1);
    expect(onCheckboxChange).not.toHaveBeenCalled();
    await user.press(
      screen.getByRole('checkbox', { name: 'Create an alert' }),
    );
    await user.press(
      screen.getByRole('radio', { name: 'External donation website' }),
    );
    expect(onCheckboxChange).toHaveBeenCalledWith(true);
    expect(onRadioChange).toHaveBeenCalledWith(true);
  });

  it('lets users choose a date while preventing future calendar days', async () => {
    const currentDate = new Date(2026, 7, 20, 9);
    const selectedDate = new Date(2026, 7, 18, 12);
    const onChange = jest.fn();
    await renderThemed(
      <DateField
        label="Day of sighting"
        date={currentDate}
        maximumDate={currentDate}
        onChange={onChange}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: 'Day of sighting, required' }),
    );
    let picker = await screen.findByTestId('dateTimePicker');
    expect(picker).toHaveProp('maximumDate', currentDate);
    expect(picker).toHaveProp(
      'display',
      Platform.OS === 'ios' ? 'inline' : 'default',
    );

    fireEvent.press(
      screen.getByRole('button', { name: 'Day of sighting, required' }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('dateTimePicker')).not.toBeOnTheScreen(),
    );

    const dateButtonName = `Choose date, current date ${currentDate.toDateString()}`;
    fireEvent.press(screen.getByRole('button', { name: dateButtonName }));
    expect(await screen.findByTestId('dateTimePicker')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: dateButtonName }));
    await waitFor(() =>
      expect(screen.queryByTestId('dateTimePicker')).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByRole('button', { name: dateButtonName }));
    picker = await screen.findByTestId('dateTimePicker');
    fireEvent(picker, 'valueChange', { nativeEvent: {} }, selectedDate);
    expect(onChange).toHaveBeenCalledWith(selectedDate);
  });

  it('opens select options in a compact popup and closes after selection', async () => {
    await renderThemed(<TimeOfSightingField />);

    const trigger = screen.getByRole('button', { name: 'Time of sighting' });
    expect(trigger).toHaveProp('accessibilityValue', {
      text: 'Select a time of day',
    });
    fireEvent.press(trigger);
    await waitFor(() =>
      expect(
        screen.getByLabelText('Time of sighting options'),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText('Time of sighting options')).toHaveStyle({
      position: 'absolute',
      maxHeight: 90,
    });
    expect(screen.getByText('Morning')).toBeOnTheScreen();
    expect(screen.getByText('Afternoon')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Select Afternoon'));

    await waitFor(() => {
      expect(screen.getByText('Afternoon')).toBeOnTheScreen();
      expect(trigger).toHaveProp('accessibilityValue', { text: 'Afternoon' });
      expect(
        screen.queryByLabelText('Time of sighting options'),
      ).not.toBeOnTheScreen();
    });
  });

  it('selects a named location by moving the map beneath a fixed pin', async () => {
    const onChange = jest.fn();
    await renderThemed(
      <LocationField
        label="Sighting location"
        value={{ latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText('Drag the map to position the pin.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('image', { name: 'Sighting location pin' }),
    ).toBeOnTheScreen();

    const map = screen.getByLabelText('Sighting location');
    const initialRegion = {
      latitude: 33.776077,
      longitude: -84.396199,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    const selectedRegion = {
      latitude: 33.772,
      longitude: -84.394,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    await fireEvent(map, 'regionChangeComplete', initialRegion);
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent(map, 'regionChangeComplete', selectedRegion);

    expect(onChange).toHaveBeenCalledWith({
      latitude: 33.772,
      longitude: -84.394,
    });
  });

  it('names cover promotion and removal and adds a selected library photo', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    const onAddPhoto = jest.fn();
    const onPromotePhoto = jest.fn();
    const onRemovePhoto = jest.fn();
    const user = userEvent.setup();
    mockPickFromLibrary.mockResolvedValue({
      ok: true,
      value: { localUri: 'file://three.jpg' },
      warnings: [],
    });
    await renderThemed(
      <PhotoField
        photos={['file://one.jpg', 'file://two.jpg']}
        coverUri="file://one.jpg"
        onAddPhoto={onAddPhoto}
        onPromotePhoto={onPromotePhoto}
        onRemovePhoto={onRemovePhoto}
      />,
    );

    await user.press(
      screen.getByRole('button', { name: 'Set photo 2 as cover' }),
    );
    await user.press(screen.getByRole('button', { name: 'Remove photo 2' }));
    await user.press(screen.getByRole('button', { name: 'Add photos' }));
    expect(onPromotePhoto).toHaveBeenCalledWith('file://two.jpg');
    expect(onRemovePhoto).toHaveBeenCalledWith('file://two.jpg');
    const chooseLibrary = alert.mock.calls[0][2]?.find(
      ({ text }) => text === 'Choose from library',
    );
    chooseLibrary?.onPress?.();
    await waitFor(() =>
      expect(onAddPhoto).toHaveBeenCalledWith('file://three.jpg'),
    );
  });

  it('hugs the add photos button with its validation border', async () => {
    await renderThemed(
      <PhotoField
        photos={[]}
        validationError="At least one photo is required."
        onAddPhoto={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add photos' })).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
      borderRadius: 999,
    });
  });

  it('uses a tappable profile circle and requests a movable circular crop', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    const onAddPhoto = jest.fn();
    const user = userEvent.setup();
    mockPickFromLibrary.mockResolvedValue({
      ok: true,
      value: { localUri: 'file://avatar.jpg' },
      warnings: [],
    });
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => {
      success(800, 600);
    });

    await renderThemed(
      <PhotoField
        photos={[]}
        label="Profile photo"
        mode="single"
        presentation="avatar"
        crop="circle"
        onAddPhoto={onAddPhoto}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Add profile photo' }));
    const chooseLibrary = alert.mock.calls[0][2]?.find(
      ({ text }) => text === 'Choose from library',
    );
    chooseLibrary?.onPress?.();

    await waitFor(() => {
      expect(mockPickFromLibrary).toHaveBeenCalledWith();
      const area = screen.getByLabelText('Circular profile photo crop area');
      expect(area).toBeOnTheScreen();
      expect(
        screen.getByTestId('profile-photo-crop-safe-area-provider'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('screen-scroll-view')).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Use photo' })).toBeEnabled();
      expect(
        screen.getByText(
          'Drag the photo to reposition it. Pinch the image to zoom.',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Move photo right' }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Zoom in' }),
      ).not.toBeOnTheScreen();
    });
    await user.press(screen.getByRole('button', { name: 'Use photo' }));
    await waitFor(() => {
      expect(mockManipulate).toHaveBeenCalledWith(
        'file://avatar.jpg',
        [expect.objectContaining({ crop: expect.any(Object) })],
        { compress: 0.9, format: 'jpeg' },
      );
      expect(onAddPhoto).toHaveBeenCalledWith('file://cropped-avatar.jpg');
    });
  });

  it('keeps a dragged profile photo in place while zooming back out', async () => {
    const panResponder = jest.spyOn(PanResponder, 'create').mockImplementation(
      (handlers) =>
        ({
          panHandlers: {
            onStartShouldSetResponder: handlers.onStartShouldSetPanResponder,
            onMoveShouldSetResponder: handlers.onMoveShouldSetPanResponder,
            onResponderGrant: handlers.onPanResponderGrant,
            onResponderMove: handlers.onPanResponderMove,
            onResponderRelease: handlers.onPanResponderRelease,
            onResponderTerminate: handlers.onPanResponderTerminate,
            onResponderTerminationRequest:
              handlers.onPanResponderTerminationRequest,
          },
        }) as ReturnType<typeof PanResponder.create>,
    );
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    mockPickFromLibrary.mockResolvedValue({
      ok: true,
      value: { localUri: 'file://avatar.jpg' },
      warnings: [],
    });
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => {
      success(800, 600);
    });

    await renderThemed(
      <PhotoField
        photos={[]}
        label="Profile photo"
        mode="single"
        presentation="avatar"
        crop="circle"
        onAddPhoto={jest.fn()}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Add profile photo' }));
    await act(async () => {
      alert.mock.calls[0][2]
        ?.find(({ text }) => text === 'Choose from library')
        ?.onPress?.();
      await Promise.resolve();
    });
    await screen.findByLabelText('Circular profile photo crop area');
    const handlers = panResponder.mock.calls.at(-1)?.[0];
    const grantEvent = {
      nativeEvent: {
        touches: [{ locationX: 120, locationY: 120, pageX: 120, pageY: 120 }],
        changedTouches: [],
      },
    };
    const moveEvent = {
      nativeEvent: {
        touches: [{ locationX: 120, locationY: 120, pageX: 160, pageY: 120 }],
        changedTouches: [],
      },
    };
    expect(
      handlers?.onStartShouldSetPanResponder?.(
        grantEvent as never,
        {} as never,
      ),
    ).toBe(true);
    expect(
      handlers?.onMoveShouldSetPanResponder?.(
        moveEvent as never,
        {} as never,
      ),
    ).toBe(true);
    expect(
      handlers?.onShouldBlockNativeResponder?.(
        moveEvent as never,
        {} as never,
      ),
    ).toBe(true);
    expect(
      handlers?.onPanResponderTerminationRequest?.(
        moveEvent as never,
        {} as never,
      ),
    ).toBe(false);
    await act(() => {
      handlers?.onPanResponderGrant?.(grantEvent as never, {} as never);
      handlers?.onPanResponderMove?.(moveEvent as never, {} as never);
      handlers?.onPanResponderRelease?.(
        { nativeEvent: {} } as never,
        {} as never,
      );

      handlers?.onPanResponderGrant?.(
        {
          nativeEvent: {
            touches: [
              { locationX: 90, locationY: 120, pageX: 90, pageY: 120 },
              { locationX: 190, locationY: 120, pageX: 190, pageY: 120 },
            ],
            changedTouches: [],
          },
        } as never,
        {} as never,
      );
      handlers?.onPanResponderMove?.(
        {
          nativeEvent: {
            touches: [
              { locationX: 40, locationY: 120, pageX: 40, pageY: 120 },
              { locationX: 240, locationY: 120, pageX: 240, pageY: 120 },
            ],
            changedTouches: [],
          },
        } as never,
        {} as never,
      );
      handlers?.onPanResponderRelease?.(
        { nativeEvent: {} } as never,
        {} as never,
      );

      handlers?.onPanResponderGrant?.(
        {
          nativeEvent: {
            touches: [
              { locationX: 40, locationY: 120, pageX: 40, pageY: 120 },
              { locationX: 240, locationY: 120, pageX: 240, pageY: 120 },
            ],
            changedTouches: [],
          },
        } as never,
        {} as never,
      );
      handlers?.onPanResponderMove?.(
        {
          nativeEvent: {
            touches: [
              { locationX: 90, locationY: 120, pageX: 90, pageY: 120 },
              { locationX: 190, locationY: 120, pageX: 190, pageY: 120 },
            ],
            changedTouches: [],
          },
        } as never,
        {} as never,
      );
      handlers?.onPanResponderRelease?.(
        { nativeEvent: {} } as never,
        {} as never,
      );
    });
    await user.press(screen.getByRole('button', { name: 'Use photo' }));

    await waitFor(() => {
      expect(mockManipulate).toHaveBeenCalled();
      const crop = mockManipulate.mock.calls.at(-1)?.[1]?.[0]?.crop;
      expect(crop.originX).toBeLessThan(100);
      expect(crop.width).toBeCloseTo(600);
    });
    panResponder.mockRestore();
  });
});

const TimeOfSightingField = () => {
  const [value, setValue] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([
    { label: 'Morning', value: 'Morning' },
    { label: 'Afternoon', value: 'Afternoon' },
  ]);
  return (
    <SelectField
      label="Time of sighting"
      required
      placeholder="Select a time of day"
      picker={{ value, setValue, open, setOpen, items, setItems }}
    />
  );
};
