import { act, renderHook } from '@testing-library/react-native';

import { useFormValidation } from './useFormValidation';

type Section = 'basics' | 'photos';
type Field = 'title' | 'photo';
type Errors = Partial<Record<Field, string>>;

const firstError = (errors: Errors): Field | undefined =>
  (['title', 'photo'] as const).find((field) => errors[field]);

const sectionForField = (field: Field): Section =>
  field === 'photo' ? 'photos' : 'basics';

describe('useFormValidation', () => {
  it('reveals current errors and targets the first invalid field after submit', async () => {
    const hook = await renderHook(
      ({ errors }: { errors: Errors }) =>
        useFormValidation<Section, Field, Errors>({
          errors,
          firstError,
          sectionForField,
        }),
      {
        initialProps: {
          errors: {
            title: 'Title is required.',
            photo: 'Photo is required.',
          },
        },
      },
    );

    expect(hook.result.current.errors).toEqual({});

    await act(async () => {
      hook.result.current.onSectionLayout('basics', 200);
      hook.result.current.onRequiredFieldLayout('title', 'basics', 30);
      expect(hook.result.current.validate()).toBe(false);
    });

    expect(hook.result.current.errors).toEqual({
      title: 'Title is required.',
      photo: 'Photo is required.',
    });
    expect(hook.result.current.toast).toEqual({
      id: 1,
      message: 'Please fill in the missing information.',
    });
    expect(hook.result.current.scrollRequest).toEqual({ id: 1, y: 230 });

    await hook.rerender({ errors: { photo: 'Photo is required.' } });

    expect(hook.result.current.errors).toEqual({
      photo: 'Photo is required.',
    });
  });

  it('accepts a valid form without revealing errors', async () => {
    const hook = await renderHook(() =>
      useFormValidation<Section, Field, Errors>({
        errors: {},
        firstError,
        sectionForField,
      }),
    );

    await act(async () => expect(hook.result.current.validate()).toBe(true));

    expect(hook.result.current.errors).toEqual({});
    expect(hook.result.current.toast).toBeUndefined();
    expect(hook.result.current.scrollRequest).toBeUndefined();
  });
});
