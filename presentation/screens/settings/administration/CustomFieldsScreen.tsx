import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { appModules } from '@/composition/appModules';
import { CustomField, RecordKind } from '@/core/domain/customFields';
import { roleAccessPolicies } from '@/core/domain';
import { RestrictedScreen } from '@/presentation/access';
import {
  AppText,
  Button,
  Card,
  FeedbackBanner,
  FormSection,
  SegmentedControl,
} from '@/presentation/ui';
import { FormTextInput, ToggleField } from '@/presentation/forms';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

export default function CustomFieldsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const [kind, setKind] = useState<RecordKind>('catalog');
  const [fields, setFields] = useState<readonly CustomField[]>([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomField['type']>('text');
  const [options, setOptions] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    setBusy(false);
    let active = true;
    setReady(false);
    setFields([]);
    setLabel('');
    setOptions('');
    setError(undefined);
    setMessage(undefined);
    if (user.role >= 3)
      void appModules.customFields.load(kind).then((result) => {
        if (!active || version !== generation.current) return;
        if (result.ok) {
          setFields(result.value.fields);
          setReady(true);
        } else setError(result.error.message);
      });
    return () => {
      active = false;
      ++generation.current;
    };
  }, [kind, user.id, user.clubId, user.role]);
  const persist = async (next: readonly CustomField[]) => {
    if (busy || !ready) return;
    const version = generation.current;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const result = await appModules.customFields.saveDefinitions(
      user,
      kind,
      next,
    );
    if (version !== generation.current) return;
    setBusy(false);
    if (result.ok) {
      setFields(next);
      setMessage('Additional fields saved.');
      setLabel('');
      setOptions('');
    } else setError(result.error.message);
  };
  return (
    <RestrictedScreen
      scroll
      keyboardAware
      title="Additional fields"
      eyebrow="President tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageAppSettings, role: user.role }}
    >
      <View style={{ gap: theme.spacing.lg }}>
        <AppText>
          Configure optional information for your club’s records. Archive a
          field to hide it without deleting saved values. Up to 20 fields per
          record type.
        </AppText>
        <SegmentedControl
          label="Record type"
          value={kind}
          onChange={(value) => {
            if (!busy) setKind(value);
          }}
          options={[
            { value: 'catalog', label: 'Cat profiles' },
            { value: 'sighting', label: 'Sightings' },
            { value: 'station', label: 'Stations' },
          ]}
        />
        {error ? <FeedbackBanner tone="danger" message={error} /> : null}
        {message ? <FeedbackBanner tone="success" message={message} /> : null}
        {!ready && !error ? (
          <AppText>Loading additional fields…</AppText>
        ) : null}
        {fields.map((field) => (
          <Card key={field.id}>
            <AppText variant="label">{field.label}</AppText>
            <AppText color="muted">
              {field.type === 'choice'
                ? `Choice: ${field.options.join(', ')}`
                : field.type}
            </AppText>
            <ToggleField
              label={`Show ${field.label}`}
              value={field.active}
              onValueChange={(active) =>
                void persist(
                  fields.map((current) =>
                    current.id === field.id ? { ...current, active } : current,
                  ),
                )
              }
            />
          </Card>
        ))}
        <FormSection title="Add a field">
          <FormTextInput
            label="Field label"
            value={label}
            maxLength={80}
            onChangeText={setLabel}
          />
          <SegmentedControl
            label="Field type"
            value={type}
            onChange={setType}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'boolean', label: 'Yes/no' },
              { value: 'choice', label: 'Choice' },
            ]}
          />
          {type === 'choice' ? (
            <FormTextInput
              label="Choices (one per line)"
              value={options}
              onChangeText={setOptions}
              multiline
            />
          ) : null}
          <Button
            label="Add field"
            disabled={!ready || fields.length >= 20 || !label.trim()}
            loading={busy}
            onPress={() =>
              void persist([
                ...fields,
                {
                  id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                  label: label.trim(),
                  type,
                  options:
                    type === 'choice'
                      ? options
                          .split('\n')
                          .map((option) => option.trim())
                          .filter(Boolean)
                      : [],
                  active: true,
                },
              ])
            }
          />
        </FormSection>
      </View>
    </RestrictedScreen>
  );
}
