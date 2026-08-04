import React from 'react';
import { Alert } from 'react-native';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { FormTextInput, PhotoField, ToggleField } from './index';

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

const renderThemed = (content: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('form controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps labels visible and forwards text changes', () => {
    const onChangeText = jest.fn();
    renderThemed(
      <FormTextInput
        label="Cat name"
        required
        helper="Use the name volunteers know."
        value="Goldie"
        onChangeText={onChangeText}
      />,
    );

    expect(screen.getByText('Cat name *')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Cat name'), 'Goldie II');
    expect(onChangeText).toHaveBeenCalledWith('Goldie II');
  });

  it('pairs switches with a descriptive label', () => {
    const onValueChange = jest.fn();
    renderThemed(<ToggleField label="Cat was fed" value={false} onValueChange={onValueChange} />);

    fireEvent(screen.getByRole('switch', { name: 'Cat was fed' }), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
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
    renderThemed(
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
