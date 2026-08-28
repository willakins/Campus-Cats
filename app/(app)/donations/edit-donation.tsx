import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AppText,
  Card,
  CardListSkeleton,
  ErrorState,
  FormSection,
  StatusPill,
} from '@/components/design';
import { RestrictedScreen } from '@/components/access';
import {
  ChoiceField,
  ChoiceGroup,
  FormScreen,
  FormTextInput,
  PhotoField,
  useFormValidation,
} from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  DEFAULT_DONATION_PAGE,
  DonationPageDraft,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { MediaSelection, localMedia, storedMedia } from '@/core/media';
import { useAppSettings, useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type DonationField = 'title' | 'description' | 'externalUrl';
type DonationSection = 'content' | 'method';
type DonationErrors = Partial<Record<DonationField, string>>;

interface DonationImageDraft {
  readonly uri: string;
  readonly selection: MediaSelection;
}

const requiredFieldOrder: readonly DonationField[] = [
  'title',
  'description',
  'externalUrl',
];

const validateDonationPage = (draft: DonationPageDraft): DonationErrors => {
  const errors: DonationErrors = {};
  if (!draft.title.trim()) errors.title = 'Donation page title is required.';
  if (!draft.description.trim()) {
    errors.description = 'Donation page description is required.';
  }
  if (draft.method === 'external') {
    if (!draft.externalUrl.trim()) {
      errors.externalUrl = 'External donation website is required.';
    } else if (!/^https:\/\//i.test(draft.externalUrl.trim())) {
      errors.externalUrl = 'Enter a secure HTTPS donation website address.';
    }
  }
  return errors;
};

const firstDonationError = (
  errors: DonationErrors,
): DonationField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

const sectionForField = (field: DonationField): DonationSection =>
  field === 'externalUrl' ? 'method' : 'content';

const EditDonationPage = () => {
  const router = useRouter();
  const actor = parseUser(useAuth().user);
  const { applySettings } = useAppSettings();
  const theme = useAppTheme();
  const authorized = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageDonations,
  );
  const [formData, setFormData] = useState<DonationPageDraft>({
    title: DEFAULT_DONATION_PAGE.title,
    description: DEFAULT_DONATION_PAGE.description,
    method: DEFAULT_DONATION_PAGE.method,
    externalUrl: DEFAULT_DONATION_PAGE.externalUrl,
  });
  const [images, setImages] = useState<readonly DonationImageDraft[]>([]);
  const [loading, setLoading] = useState(authorized);
  const [loaded, setLoaded] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const validation = useFormValidation<
    DonationSection,
    DonationField,
    DonationErrors
  >({
    errors: validateDonationPage(formData),
    firstError: firstDonationError,
    sectionForField,
  });

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void appModules.appSettings.get().then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const page = result.value.donationPage;
      setConfigured(Boolean(page.title.trim()));
      setFormData({
        title: page.title,
        description: page.description,
        method: page.method,
        externalUrl: page.externalUrl,
      });
      setImages(
        page.images.map(({ id, url }) => ({
          uri: url,
          selection: storedMedia(id),
        })),
      );
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [actor.id, authorized]);

  const update = <Key extends keyof DonationPageDraft>(
    key: Key,
    value: DonationPageDraft[Key],
  ) => setFormData((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (busy) return;
    setError(undefined);
    if (!validation.validate()) return;
    setBusy(true);
    const result = await appModules.appSettings.saveDonationPage(
      actor,
      formData,
      images.map(({ selection }) => selection),
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    applySettings(result.value);
    router.back();
  };

  if (loading) {
    return (
      <RestrictedScreen
        title="Donation page"
        eyebrow="President tools"
        onBack={() => router.back()}
        access={{ policy: roleAccessPolicies.manageDonations, role: actor.role }}
      >
        <CardListSkeleton label="Loading donation page" layout="actions" />
      </RestrictedScreen>
    );
  }

  if (error && !loaded) {
    return (
      <RestrictedScreen
        title="Donation page"
        eyebrow="President tools"
        onBack={() => router.back()}
        access={{ policy: roleAccessPolicies.manageDonations, role: actor.role }}
      >
        <ErrorState title="Donation page unavailable" message={error} />
      </RestrictedScreen>
    );
  }

  return (
    <FormScreen
      title={configured ? 'Edit donation page' : 'Create donation page'}
      eyebrow="President tools"
      access={{ policy: roleAccessPolicies.manageDonations, role: actor.role }}
      saveLabel={configured ? 'Save Donation Page' : 'Create Donation Page'}
      savingLabel="Saving donation page…"
      busy={busy}
      saveDisabled={formData.method === 'direct'}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
      onBack={() => router.back()}
      onSave={() => void save()}
    >
      <FormSection
        title="Donation page"
        testID="donation-section-content"
        onLayout={({ nativeEvent }) => {
          validation.onSectionLayout('content', nativeEvent.layout.y);
        }}
      >
        <View
          testID="donation-field-title"
          onLayout={({ nativeEvent }) => {
            validation.onRequiredFieldLayout(
              'title',
              'content',
              nativeEvent.layout.y,
            );
          }}
        >
          <FormTextInput
            label="Donation page title"
            required
            maxLength={120}
            value={formData.title}
            error={validation.errors.title}
            placeholder="Help us care for campus cats"
            onChangeText={(title) => update('title', title)}
          />
        </View>
        <View
          onLayout={({ nativeEvent }) => {
            validation.onRequiredFieldLayout(
              'description',
              'content',
              nativeEvent.layout.y,
            );
          }}
        >
          <FormTextInput
            label="Donation page description"
            required
            multiline
            maxLength={5000}
            value={formData.description}
            error={validation.errors.description}
            placeholder="Explain how donations support the club and its cats."
            onChangeText={(description) => update('description', description)}
          />
        </View>
      </FormSection>

      <FormSection
        title="Donation method"
        onLayout={({ nativeEvent }) => {
          validation.onSectionLayout('method', nativeEvent.layout.y);
        }}
      >
        <ChoiceGroup label="Donation method">
          <ChoiceField
            kind="radio"
            label="Link to an external donation website"
            checked={formData.method === 'external'}
            onChange={() => update('method', 'external')}
          />
          <ChoiceField
            kind="radio"
            label="Integrate donations directly"
            checked={formData.method === 'direct'}
            onChange={() => update('method', 'direct')}
          />
        </ChoiceGroup>
        {formData.method === 'external' ? (
          <View
            onLayout={({ nativeEvent }) => {
              validation.onRequiredFieldLayout(
                'externalUrl',
                'method',
                nativeEvent.layout.y,
              );
            }}
          >
            <FormTextInput
              label="External donation website"
              required
              inputMode="url"
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.externalUrl}
              error={validation.errors.externalUrl}
              placeholder="https://give.example.org/campus-cats"
              onChangeText={(externalUrl) => update('externalUrl', externalUrl)}
            />
          </View>
        ) : (
          <Card accent={theme.colors.gold}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="section">Direct donations</AppText>
              <StatusPill label="Coming soon" tone="info" />
              <AppText color="muted">
                In-app payment processing will be available in a future update.
              </AppText>
            </View>
          </Card>
        )}
      </FormSection>

      <FormSection title="Photo">
        <PhotoField
          photos={images.map(({ uri }) => uri)}
          hideLabel
          helper="Add one optional photo for the donation page."
          coverUri={images[0]?.uri}
          onAddPhoto={(uri) =>
            setImages([{ uri, selection: localMedia(uri) }])
          }
          onRemovePhoto={(uri) => {
            setImages((current) =>
              current.filter((image) => image.uri !== uri),
            );
          }}
        />
      </FormSection>
    </FormScreen>
  );
};

export default EditDonationPage;
