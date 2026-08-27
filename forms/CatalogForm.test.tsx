import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { parseCatalogTag } from '../core/domain';
import { AppThemeProvider } from '../theme';
import { CatalogForm } from './CatalogForm';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/forms', () => ({
  FormTextInput: () => null,
  PhotoField: () => null,
  SelectField: () => null,
}));

const picker = {
  value: 'Unknown',
  setValue: jest.fn(),
  open: false,
  setOpen: jest.fn(),
  items: [{ label: 'Unknown', value: 'Unknown' }],
  setItems: jest.fn(),
};

describe('CatalogForm tags', () => {
  it('renders configured labels and reports selected tag changes', async () => {
    const user = userEvent.setup();
    const onSelectedTagIdsChange = jest.fn();
    await render(
      <AppThemeProvider colorScheme="light">
        <CatalogForm
          formData={{
            name: '',
            descShort: '',
            descLong: '',
            colorPattern: '',
            behavior: '',
            yearsRecorded: '',
            AoR: '',
            furPattern: '',
            credits: '',
          }}
          setFormData={jest.fn()}
          pickers={{
            statusPicker: picker,
            tnrPicker: picker,
            sexPicker: picker,
            furPicker: picker,
          } as never}
          photos={[]}
          setPhotos={jest.fn()}
          availableTags={[
            parseCatalogTag({ id: 'feral', label: 'Community cat' }),
            parseCatalogTag({ id: 'medical', label: 'Needs medication' }),
          ]}
          selectedTagIds={['feral']}
          onSelectedTagIdsChange={onSelectedTagIdsChange}
        />
      </AppThemeProvider>,
    );

    expect(
      screen.getByRole('button', { name: 'Community cat' }),
    ).toHaveProp('accessibilityState', { selected: true });
    await user.press(screen.getByRole('button', { name: 'Needs medication' }));
    expect(onSelectedTagIdsChange).toHaveBeenLastCalledWith([
      'feral',
      'medical',
    ]);
    await user.press(screen.getByRole('button', { name: 'Community cat' }));
    expect(onSelectedTagIdsChange).toHaveBeenLastCalledWith([]);
  });
});
