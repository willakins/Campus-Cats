import React from 'react';

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import ManageCatalogTags, {
  updateCatalogTagsSequentially,
} from '../../app/(app)/settings/catalog-tags';
import { Role, parseCatalogTag } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockList = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
let mockRole: Role = Role.Officer;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalogTags: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const tags = [
  parseCatalogTag({ id: 'adopted', label: 'Adopted' }),
  parseCatalogTag({ id: 'tnr-complete', label: 'TNR complete' }),
];

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <ManageCatalogTags />
    </AppThemeProvider>,
  );

describe('manage catalog tags route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Officer;
    mockList.mockResolvedValue({ ok: true, value: tags, warnings: [] });
    mockCreate.mockResolvedValue({
      ok: true,
      value: parseCatalogTag({ id: 'medical', label: 'Needs medication' }),
      warnings: [],
    });
    mockUpdate.mockResolvedValue({
      ok: true,
      value: parseCatalogTag({ id: 'adopted', label: 'Rehomed' }),
      warnings: [],
    });
    mockRemove.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('blocks members before loading officer-managed tags', async () => {
    mockRole = Role.Member;
    await renderRoute();

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockList).not.toHaveBeenCalled();
  });

  it('expands and collapses the officer-only explanation from the header', async () => {
    const user = userEvent.setup();
    await renderRoute();

    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );
    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Officer-level access is required to manage catalog tags.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Explain officer-only access' }),
    ).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Hide officer-only explanation' }),
    );
    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    ).toBeOnTheScreen();
  });

  it('lets officers rename existing defaults and add custom tags', async () => {
    const user = userEvent.setup();
    await renderRoute();

    await screen.findByDisplayValue('Adopted');
    fireEvent.changeText(screen.getByLabelText('Tag name 1'), 'Rehomed');
    await user.press(screen.getByRole('button', { name: 'Save tag changes' }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'adopted',
        'Rehomed',
      ),
    );
    expect(await screen.findByText('Catalog tags saved.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText('New tag name'), 'Needs medication');
    await user.press(screen.getByRole('button', { name: 'Add tag' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'Needs medication',
      ),
    );
    expect(
      await screen.findByText('Needs medication was added.'),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Needs medication')).toBeOnTheScreen();
  });

  it('saves multiple renames sequentially so one settings write cannot overwrite another', async () => {
    let finishFirstUpdate: (value: unknown) => void = () => undefined;
    mockUpdate
      .mockImplementationOnce(() => new Promise((resolve) => {
        finishFirstUpdate = resolve;
      }))
      .mockResolvedValueOnce({
        ok: true,
        value: parseCatalogTag({ id: 'tnr-complete', label: 'Fixed' }),
        warnings: [],
      });
    const saving = updateCatalogTagsSequentially(
      [
        parseCatalogTag({ id: 'adopted', label: 'Rehomed' }),
        parseCatalogTag({ id: 'tnr-complete', label: 'Fixed' }),
      ],
      (tag) => mockUpdate(tag),
    );

    await Promise.resolve();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    finishFirstUpdate({
      ok: true,
      value: parseCatalogTag({ id: 'adopted', label: 'Rehomed' }),
      warnings: [],
    });
    await saving;
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});
