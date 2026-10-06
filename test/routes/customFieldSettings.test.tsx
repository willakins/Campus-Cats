import React from 'react';
import {
  render,
  screen,
  fireEvent,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import CustomFieldsScreen from '../../presentation/screens/settings/administration/CustomFieldsScreen';
import { AppThemeProvider } from '../../theme';
const mockLoad = jest.fn();
const mockSave = jest.fn();
let mockClubId = 'club-one';
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({ user: { id: 'president', role: 3, clubId: mockClubId } }),
}));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    customFields: {
      load: (...args: unknown[]) => mockLoad(...args),
      saveDefinitions: (...args: unknown[]) => mockSave(...args),
    },
  },
}));
it('ignores a pending definition save after switching clubs', async () => {
  mockLoad.mockResolvedValue({ ok: true, value: { fields: [], values: {} } });
  let finish!: (value: unknown) => void;
  mockSave.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = await render(
    <AppThemeProvider>
      <CustomFieldsScreen />
    </AppThemeProvider>,
  );
  await waitFor(() =>
    expect(
      screen.queryByText('Loading additional fields…'),
    ).not.toBeOnTheScreen(),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Field label'),
    'Old club field',
  );
  await userEvent
    .setup()
    .press(screen.getByRole('button', { name: 'Add field' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  mockClubId = 'club-two';
  await view.rerender(
    <AppThemeProvider>
      <CustomFieldsScreen />
    </AppThemeProvider>,
  );
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
  finish({ ok: true, value: undefined });
  await waitFor(() =>
    expect(
      screen.queryByLabelText('Show Old club field'),
    ).not.toBeOnTheScreen(),
  );
  expect(screen.queryByText('Additional fields saved.')).not.toBeOnTheScreen();
});
