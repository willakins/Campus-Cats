import React from 'react';
import { Alert } from 'react-native';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { IconButton } from '../design';
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

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => ReactRuntime.createElement(NativeView, props),
  };
});
jest.mock('../../composition/appModules', () => ({
  appModules: {
    imageSelection: {
      takePhoto: (...args: unknown[]) => mockTakePhoto(...args),
      pickFromLibrary: (...args: unknown[]) => mockPickFromLibrary(...args),
    },
  },
}));

const renderThemed = async (content: React.ReactElement) =>
  await render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('form controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(screen.getByText('Cat name *')).toBeOnTheScreen();
    const input = screen.getByLabelText('Cat name');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Goldie II');
    await fireEvent(input, 'blur');
    expect(onChangeText).toHaveBeenCalledWith('Goldie II');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('pairs switches with a descriptive label', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<ToggleField label="Cat was fed" value={false} onValueChange={onValueChange} />);

    await fireEvent(screen.getByRole('switch', { name: 'Cat was fed' }), 'valueChange', true);
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
          label="Create an announcement"
          helper="Tell members that the survey is ready."
          checked={false}
          trailing={(
            <IconButton
              icon="information-outline"
              accessibilityLabel="Explain announcement access"
              onPress={onTrailingPress}
            />
          )}
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
      screen.getByRole('checkbox', { name: 'Create an announcement' }),
    ).toHaveProp('accessibilityState', { checked: false });
    expect(
      screen.getByRole('radio', { name: 'External donation website' }),
    ).toHaveProp('accessibilityState', { checked: true });
    expect(
      screen.getByText('Tell members that the survey is ready.'),
    ).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Explain announcement access' }),
    );
    expect(onTrailingPress).toHaveBeenCalledTimes(1);
    expect(onCheckboxChange).not.toHaveBeenCalled();
    await user.press(
      screen.getByRole('checkbox', { name: 'Create an announcement' }),
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

    fireEvent.press(screen.getByText('Day of sighting *'));
    const picker = await screen.findByTestId('dateTimePicker');
    expect(picker).toHaveProp('maximumDate', currentDate);

    fireEvent(picker, 'valueChange', { nativeEvent: {} }, selectedDate);
    expect(onChange).toHaveBeenCalledWith(selectedDate);
  });

  it('opens select options in a compact popup and closes after selection', async () => {
    await renderThemed(<TimeOfSightingField />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Time of sighting' }),
    );
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

    expect(screen.getByText('Drag the map to position the pin.')).toBeOnTheScreen();
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
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
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

    await user.press(screen.getByRole('button', { name: 'Set photo 2 as cover' }));
    await user.press(screen.getByRole('button', { name: 'Remove photo 2' }));
    await user.press(screen.getByRole('button', { name: 'Add photos' }));
    expect(onPromotePhoto).toHaveBeenCalledWith('file://two.jpg');
    expect(onRemovePhoto).toHaveBeenCalledWith('file://two.jpg');
    const chooseLibrary = alert.mock.calls[0][2]?.find(({ text }) => text === 'Choose from library');
    chooseLibrary?.onPress?.();
    await waitFor(() => expect(onAddPhoto).toHaveBeenCalledWith('file://three.jpg'));
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
