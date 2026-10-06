import React from 'react';
import {
  render,
  screen,
  fireEvent,
  userEvent,
} from '@testing-library/react-native';
import { useRecordFields } from './CustomFields';
import { Button } from '@/presentation/ui';
import { AppThemeProvider } from '@/theme';
const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockResult = jest.fn();
jest.mock('@/composition/appModules', () => ({
  appModules: {
    customFields: {
      load: (...args: unknown[]) => mockLoad(...args),
      saveValues: (...args: unknown[]) => mockSave(...args),
    },
  },
}));
jest.mock('@/presentation/providers', () => ({
  useAuth: () => ({ user: { id: 'owner', clubId: 'club' } }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
function Form() {
  const fields = useRecordFields('catalog');
  return (
    <>
      {fields.content}
      <Button
        label="Create record"
        onPress={() =>
          void fields.saveRecord(mockCreate, mockUpdate).then(mockResult)
        }
      />
    </>
  );
}
const field = {
  id: 'weight',
  label: 'Weight',
  type: 'number',
  active: true,
  options: [],
};
beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue({
    ok: true,
    value: { fields: [field], values: {} },
    warnings: [],
  });
  mockCreate.mockResolvedValue({
    ok: true,
    value: { id: 'record-one' },
    warnings: [],
  });
  mockUpdate.mockResolvedValue({
    ok: true,
    value: { id: 'record-one' },
    warnings: [],
  });
  mockSave.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
});
it('validates numeric values before creating the main record', async () => {
  await render(
    <AppThemeProvider>
      <Form />
    </AppThemeProvider>,
  );
  await fireEvent.changeText(
    await screen.findByLabelText('Weight'),
    'not a number',
  );
  await userEvent
    .setup()
    .press(screen.getByRole('button', { name: 'Create record' }));
  expect(mockResult).toHaveBeenCalledWith(
    expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'validation' }),
    }),
  );
  expect(mockCreate).not.toHaveBeenCalled();
});
it('retries a failed additional-field write without creating a duplicate record', async () => {
  mockSave.mockResolvedValueOnce({
    ok: false,
    error: { code: 'dependency_failure', message: 'Retry' },
  });
  await render(
    <AppThemeProvider>
      <Form />
    </AppThemeProvider>,
  );
  await fireEvent.changeText(await screen.findByLabelText('Weight'), '4.5');
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Create record' }));
  await user.press(screen.getByRole('button', { name: 'Create record' }));
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith('record-one');
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave).toHaveBeenLastCalledWith('catalog', 'record-one', [field], {
    weight: 4.5,
  });
  expect(mockResult).toHaveBeenLastCalledWith(
    expect.objectContaining({ ok: true, value: { id: 'record-one' } }),
  );
});
