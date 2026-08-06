import React from 'react';
import { Alert } from 'react-native';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { FormTextInput, LocationField, PhotoField, ToggleField } from './index';

const mockTakePhoto = jest.fn();
const mockPickFromLibrary = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
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
    await renderThemed(
      <FormTextInput
        label="Cat name"
        required
        helper="Use the name volunteers know."
        value="Goldie"
        onChangeText={onChangeText}
      />,
    );

    expect(screen.getByText('Cat name *')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Goldie II');
    expect(onChangeText).toHaveBeenCalledWith('Goldie II');
  });

  it('pairs switches with a descriptive label', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<ToggleField label="Cat was fed" value={false} onValueChange={onValueChange} />);

    await fireEvent(screen.getByRole('switch', { name: 'Cat was fed' }), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
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
