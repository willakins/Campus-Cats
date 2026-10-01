import { useRef, useState } from 'react';

import { FormScrollRequest, FormToastMessage } from './FormScreen';

const defaultValidationMessage = 'Please fill in the missing information.';

interface FormValidationOptions<
  Section extends string,
  Field extends string,
  Errors extends Readonly<Partial<Record<Field, string>>>,
> {
  readonly errors: Errors;
  readonly firstError: (errors: Errors) => Field | undefined;
  readonly sectionForField: (field: Field) => Section;
  readonly message?: string;
}

/**
 * Owns the interaction shared by validated forms: hide errors until submit,
 * reveal and keep them current after submit, and focus the first invalid field.
 */
export const useFormValidation = <
  Section extends string,
  Field extends string,
  Errors extends Readonly<Partial<Record<Field, string>>>,
>({
  errors,
  firstError,
  sectionForField,
  message = defaultValidationMessage,
}: FormValidationOptions<Section, Field, Errors>) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [toast, setToast] = useState<FormToastMessage>();
  const [scrollRequest, setScrollRequest] = useState<FormScrollRequest>();
  const requestId = useRef(0);
  const emptyErrors = useRef<Errors>({} as Errors);
  const sectionOffsets = useRef<Partial<Record<Section, number>>>({});
  const fieldOffsets = useRef<
    Partial<Record<Field, { readonly section: Section; readonly y: number }>>
  >({});

  const validate = () => {
    const invalidField = firstError(errors);
    if (!invalidField) {
      setHasSubmitted(false);
      return true;
    }

    setHasSubmitted(true);
    const id = ++requestId.current;
    setToast({ id, message });
    const fieldOffset = fieldOffsets.current[invalidField];
    const section = fieldOffset?.section ?? sectionForField(invalidField);
    setScrollRequest({
      id,
      y: (sectionOffsets.current[section] ?? 0) + (fieldOffset?.y ?? 0),
    });
    return false;
  };

  return {
    errors: hasSubmitted ? errors : emptyErrors.current,
    scrollRequest,
    toast,
    validate,
    onSectionLayout: (section: Section, y: number) => {
      sectionOffsets.current[section] = y;
    },
    onRequiredFieldLayout: (field: Field, section: Section, y: number) => {
      fieldOffsets.current[field] = { section, y };
    },
  };
};
