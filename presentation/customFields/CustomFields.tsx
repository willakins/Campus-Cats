import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { appModules } from '@/composition/appModules';
import { Outcome, failure } from '@/core/domain';
import {
  CustomField,
  CustomFieldValues,
  RecordKind,
  validateCustomFieldValues,
} from '@/core/domain/customFields';
import {
  AppText,
  Button,
  FeedbackBanner,
  FormSection,
} from '@/presentation/ui';
import { FormTextInput, SelectField, ToggleField } from '@/presentation/forms';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

type DraftValues = Record<string, string | boolean | null>;
function ChoiceInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Not specified', value: '' },
    ...field.options.map((value) => ({ label: value, value })),
  ]);
  return (
    <SelectField
      label={field.label}
      placeholder="Not specified"
      picker={{
        value,
        setValue: (update) =>
          onChange(typeof update === 'function' ? update(value) : update),
        open,
        setOpen,
        items,
        setItems,
      }}
    />
  );
}
export function CustomFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: readonly CustomField[];
  values: DraftValues;
  onChange: (values: DraftValues) => void;
}) {
  const theme = useAppTheme();
  const active = fields.filter((field) => field.active);
  if (!active.length) return null;
  return (
    <FormSection title="Additional information">
      <AppText color="muted">Optional fields configured by your club.</AppText>
      {active.map((field) => (
        <View key={field.id} style={{ gap: theme.spacing.xs }}>
          {field.type === 'boolean' ? (
            <ToggleField
              label={field.label}
              value={values[field.id] === true}
              onValueChange={(value) =>
                onChange({ ...values, [field.id]: value })
              }
            />
          ) : field.type === 'choice' ? (
            <ChoiceInput
              field={field}
              value={String(values[field.id] ?? '')}
              onChange={(value) =>
                onChange({ ...values, [field.id]: value || null })
              }
            />
          ) : (
            <FormTextInput
              label={field.label}
              value={String(values[field.id] ?? '')}
              keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
              maxLength={field.type === 'text' ? 1000 : 40}
              onChangeText={(value) =>
                onChange({ ...values, [field.id]: value })
              }
            />
          )}
          {field.type === 'boolean' &&
          values[field.id] !== undefined &&
          values[field.id] !== null ? (
            <Button
              label={`Clear ${field.label}`}
              variant="tertiary"
              onPress={() => onChange({ ...values, [field.id]: null })}
            />
          ) : null}
        </View>
      ))}
    </FormSection>
  );
}
const draftsFromValues = (values: CustomFieldValues): DraftValues =>
  Object.fromEntries(
    Object.entries(values).map(([id, value]) => [
      id,
      typeof value === 'number' ? String(value) : value,
    ]),
  );

export function useRecordFields(kind: RecordKind, id?: string) {
  const { user } = useAuth();
  const [fields, setFields] = useState<readonly CustomField[]>([]);
  const [values, setValues] = useState<DraftValues>({});
  const [loaded, setLoaded] = useState(!appModules.customFields);
  const [error, setError] = useState<string>();
  const sessionVersion = useRef(0);
  const [reload, setReload] = useState(0);
  const savedRecord = useRef<{ id: string } | undefined>(undefined);
  useEffect(() => {
    const version = ++sessionVersion.current;
    savedRecord.current = undefined;
    setValues({});
    setFields([]);
    setError(undefined);
    if (!appModules.customFields) return;
    let active = true;
    setLoaded(false);
    void appModules.customFields.load(kind, id).then((result) => {
      if (!active || version !== sessionVersion.current) return;
      if (result.ok) {
        setFields(result.value.fields);
        setValues(draftsFromValues(result.value.values));
        setLoaded(true);
      } else setError(result.error.message);
    });
    return () => {
      active = false;
      ++sessionVersion.current;
    };
  }, [kind, id, user.id, user.clubId, reload]);

  const saveRecord = async <T extends { readonly id: string }>(
    operation: () => Promise<Outcome<T>>,
    updateExisting?: (recordId: string) => Promise<Outcome<T>>,
  ): Promise<Outcome<T>> => {
    const version = sessionVersion.current;
    if (!loaded)
      return failure(
        'dependency_failure',
        error ?? 'Additional fields are still loading. Please retry.',
      );
    const submitted: CustomFieldValues = Object.fromEntries(
      fields
        .filter((field) => field.active)
        .map((field) => {
          const value = values[field.id];
          return [
            field.id,
            value === undefined || value === null || value === ''
              ? null
              : field.type === 'number'
                ? Number(value)
                : value,
          ];
        }),
    );
    try {
      validateCustomFieldValues(fields, submitted);
    } catch (error) {
      return failure(
        'validation',
        error instanceof Error ? error.message : 'Invalid additional fields',
      );
    }
    // Retry a failed sidecar save without creating a second main record.
    const result =
      !id && savedRecord.current
        ? updateExisting
          ? await updateExisting(savedRecord.current.id)
          : { ok: true as const, value: savedRecord.current as T, warnings: [] }
        : await operation();
    if (version !== sessionVersion.current)
      return failure(
        'unauthenticated',
        'Account or club changed. Reload the form.',
      );
    if (!result.ok) return result;
    if (!id) savedRecord.current = result.value;
    if (fields.some((field) => field.active)) {
      const saved = await appModules.customFields.saveValues(
        kind,
        result.value.id,
        fields,
        submitted,
      );
      if (version !== sessionVersion.current)
        return failure(
          'unauthenticated',
          'Account or club changed. Reload the form.',
        );
      if (!saved.ok) return saved;
    }
    return result;
  };
  return {
    saveRecord,
    content: (
      <>
        {error ? (
          <>
            <FeedbackBanner tone="danger" message={error} />
            <Button
              label="Retry additional fields"
              onPress={() => setReload((value) => value + 1)}
            />
          </>
        ) : null}
        {!loaded && !error ? (
          <AppText color="muted">Loading additional fields…</AppText>
        ) : null}
        <CustomFieldInputs
          fields={fields}
          values={values}
          onChange={setValues}
        />
      </>
    ),
  };
}

export function CustomFieldDetails({
  kind,
  id,
}: {
  kind: RecordKind;
  id: string;
}) {
  const { user } = useAuth();
  const [fields, setFields] = useState<readonly CustomField[]>([]);
  const [values, setValues] = useState<CustomFieldValues>({});
  const [error, setError] = useState<string>();
  const theme = useAppTheme();
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setFields([]);
      setValues({});
      setError(undefined);
      if (appModules.customFields)
        void appModules.customFields.load(kind, id).then((result) => {
          if (!active) return;
          if (result.ok) {
            setFields(result.value.fields);
            setValues(result.value.values);
          } else setError(result.error.message);
        });
      return () => {
        active = false;
      };
    }, [kind, id, user.id, user.clubId]),
  );
  if (error) return <FeedbackBanner tone="warning" message={error} />;
  const shown = fields.filter(
    (field) =>
      field.active &&
      values[field.id] !== undefined &&
      values[field.id] !== null &&
      values[field.id] !== '',
  );
  if (!shown.length) return null;
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <FormSection title="Additional information">
        {shown.map((field) => (
          <View key={field.id} style={{ gap: theme.spacing.xxs }}>
            <AppText variant="label">{field.label}</AppText>
            <AppText>
              {typeof values[field.id] === 'boolean'
                ? values[field.id]
                  ? 'Yes'
                  : 'No'
                : String(values[field.id])}
            </AppText>
          </View>
        ))}
      </FormSection>
    </View>
  );
}
