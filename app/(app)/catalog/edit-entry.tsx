import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { RestrictedAccess } from '@/components/access';
import {
  AppHeader,
  ErrorState,
  FormSkeleton,
  Screen,
} from '@/components/design';
import { FormScreen, useFormValidation } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  Cat,
  CatalogTag,
  CatalogOverride,
  CatalogRecord,
  CatStatus,
  Fur,
  parseUser,
  roleAccessPolicies,
  Sex,
  TNRStatus,
} from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import {
  DisplayMediaAsset,
  StoredMediaAsset,
  isExternalMediaAsset,
} from '@/core/ports';
import {
  defaultCatalogTagIdsForCat,
  isSourceManagedCatalogEntry,
} from '@/features/catalog/catalogDiscovery';
import {
  catalogSectionForField,
  CatalogForm,
  CatalogFormData,
  CatalogFormErrors,
  CatalogFormSection,
  CatalogRequiredField,
  firstCatalogErrorField,
  validateCatalogForm,
} from '@/forms/CatalogForm';
import { useAuth } from '@/providers';
import { PickerConfig } from '@/types';

const statusItems = ['Adopted', 'Deceased', 'Feral', 'Frat Cat', 'Unknown'].map(
  (value) => ({ label: value, value }),
);
const tnrItems = ['Yes', 'No', 'Unknown'].map((value) => ({
  label: value,
  value,
}));
const sexItems = ['Male', 'Female', 'Unknown'].map((value) => ({
  label: value,
  value,
}));
const furItems = ['Short', 'Medium', 'Long', 'Unknown'].map((value) => ({
  label: value,
  value,
}));
const validateEditCatalogForm = ({
  formData,
  profile,
  sourceManaged,
}: {
  formData: CatalogFormData;
  profile: string;
  sourceManaged: boolean;
}): CatalogFormErrors => {
  if (sourceManaged) return {};
  const errors = validateCatalogForm({
    formData,
    photos: profile ? [profile] : [],
  });
  return errors.photos
    ? { ...errors, photos: 'At least one profile photo is required.' }
    : errors;
};

const EditEntry = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [entry, setEntry] = useState<CatalogRecord>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>(
    [],
  );
  const [displayAssets, setDisplayAssets] = useState<
    readonly DisplayMediaAsset[]
  >([]);
  const [availableTags, setAvailableTags] = useState<readonly CatalogTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>();
  const [tagsReady, setTagsReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [statusValue, setStatusValue] = useState<CatStatus>('Unknown');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState(statusItems);
  const [tnrValue, setTnrValue] = useState<TNRStatus>('Unknown');
  const [tnrOpen, setTnrOpen] = useState(false);
  const [tnrOptions, setTnrOptions] = useState(tnrItems);
  const [sexValue, setSexValue] = useState<Sex>('Unknown');
  const [sexOpen, setSexOpen] = useState(false);
  const [sexOptions, setSexOptions] = useState(sexItems);
  const [furValue, setFurValue] = useState<Fur>('Unknown');
  const [furOpen, setFurOpen] = useState(false);
  const [furOptions, setFurOptions] = useState(furItems);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    descShort: '',
    descLong: '',
    colorPattern: '',
    behavior: '',
    yearsRecorded: '',
    AoR: '',
    furPattern: '',
    credits: '',
  });
  const pickers = {
    statusPicker: {
      value: statusValue,
      setValue: setStatusValue,
      open: statusOpen,
      setOpen: setStatusOpen,
      items: statusOptions,
      setItems: setStatusOptions,
    } as PickerConfig<CatStatus>,
    tnrPicker: {
      value: tnrValue,
      setValue: setTnrValue,
      open: tnrOpen,
      setOpen: setTnrOpen,
      items: tnrOptions,
      setItems: setTnrOptions,
    } as PickerConfig<TNRStatus>,
    sexPicker: {
      value: sexValue,
      setValue: setSexValue,
      open: sexOpen,
      setOpen: setSexOpen,
      items: sexOptions,
      setItems: setSexOptions,
    } as PickerConfig<Sex>,
    furPicker: {
      value: furValue,
      setValue: setFurValue,
      open: furOpen,
      setOpen: setFurOpen,
      items: furOptions,
      setItems: setFurOptions,
    } as PickerConfig<Fur>,
  };
  const sourceManaged = entry ? isSourceManagedCatalogEntry(entry) : false;
  const validation = useFormValidation<
    CatalogFormSection,
    CatalogRequiredField,
    CatalogFormErrors
  >({
    errors: validateEditCatalogForm({ formData, profile, sourceManaged }),
    firstError: firstCatalogErrorField,
    sectionForField: catalogSectionForField,
  });

  useEffect(() => {
    if (!id) {
      setLoadError('Missing catalog entry ID');
      return;
    }
    let active = true;
    void Promise.all([
      appModules.catalog.get(parseUser(user), id),
      appModules.catalog.media(id),
      appModules.catalogTags.list(parseUser(user)),
      appModules.catalogTags.assignments(parseUser(user)),
    ]).then(([entryResult, mediaResult, tagsResult, assignmentsResult]) => {
      if (!active) return;
      if (!entryResult.ok) {
        setLoadError(entryResult.error.message);
        return;
      }
      const loaded = entryResult.value;
      setEntry(loaded);
      setFormData({
        name: loaded.cat.name,
        descShort: loaded.cat.descShort,
        descLong: loaded.cat.descLong ?? '',
        colorPattern: loaded.cat.colorPattern ?? '',
        behavior: loaded.cat.behavior ?? '',
        yearsRecorded: loaded.cat.yearsRecorded ?? '',
        AoR: loaded.cat.AoR ?? '',
        furPattern: loaded.cat.furPattern ?? '',
        credits:
          loaded.source === 'inaturalist' && loaded.localContribution
            ? loaded.localContribution.credits
            : loaded.credits,
      });
      setStatusValue(loaded.cat.currentStatus ?? 'Unknown');
      setTnrValue(loaded.cat.tnr ?? 'Unknown');
      setSexValue(loaded.cat.sex ?? 'Unknown');
      setFurValue(loaded.cat.furLength ?? 'Unknown');
      if (tagsResult.ok && assignmentsResult.ok) {
        setAvailableTags(tagsResult.value);
        setSelectedTagIds(
          assignmentsResult.value.find(
            ({ catalogId }) => catalogId === loaded.id,
          )?.tagIds,
        );
        setTagsReady(true);
      } else if (!tagsResult.ok) setError(tagsResult.error.message);
      else if (!assignmentsResult.ok) setError(assignmentsResult.error.message);
      if (mediaResult.ok) {
        setDisplayAssets(mediaResult.value);
        setStoredAssets(
          mediaResult.value.filter(
            (asset): asset is StoredMediaAsset => !isExternalMediaAsset(asset),
          ),
        );
        setProfile(
          mediaResult.value.find(({ role }) => role === 'profile')?.url ?? '',
        );
        setPhotos(
          mediaResult.value
            .filter(({ role }) => role === 'gallery')
            .map(({ url }) => url),
        );
      } else setError(mediaResult.error.message);
    });
    return () => {
      active = false;
    };
  }, [id, user.id, user.role]);

  const cat = (): Cat => ({
    ...formData,
    currentStatus: statusValue,
    furLength: furValue,
    tnr: tnrValue,
    sex: sexValue,
  });
  const resolvedTagIds = (
    selectedTagIds ?? defaultCatalogTagIdsForCat(cat())
  ).filter((tagId) =>
    availableTags.some(({ id: configuredId }) => configuredId === tagId),
  );
  const selectionFor = (uri: string) => {
    const stored = storedAssets.find((asset) => asset.url === uri);
    return stored ? storedMedia(stored.id) : localMedia(uri);
  };
  const promotePhoto = (uri: string) => {
    setPhotos((current) =>
      [profile, ...current.filter((photo) => photo !== uri)].filter(Boolean),
    );
    setProfile(uri);
  };
  const removePhoto = (uri: string) => {
    if (uri === profile) setProfile('');
    else setPhotos((current) => current.filter((photo) => photo !== uri));
  };
  const save = async () => {
    if (!entry || busy) return;
    setError(undefined);
    if (!validation.validate()) return;
    if (!tagsReady) {
      setError('Catalog tags could not be loaded. Please try again.');
      return;
    }
    setBusy(true);
    const actor = parseUser(user);
    const selectedCover = displayAssets.find(({ url }) => url === profile);
    const overrides: CatalogOverride = {
      name: formData.name.trim() || undefined,
      descShort: formData.descShort.trim() || undefined,
      descLong: formData.descLong.trim() || undefined,
      colorPattern: formData.colorPattern.trim() || undefined,
      behavior: formData.behavior.trim() || undefined,
      yearsRecorded: formData.yearsRecorded.trim() || undefined,
      AoR: formData.AoR.trim() || undefined,
      currentStatus: statusValue,
      furLength: furValue,
      furPattern: formData.furPattern.trim() || undefined,
      tnr: tnrValue,
      sex: sexValue,
      coverPhotoId:
        selectedCover && isExternalMediaAsset(selectedCover)
          ? selectedCover.id
          : undefined,
    };
    const localUpdate = {
      cat: cat(),
      credits: formData.credits,
      profile: selectionFor(profile),
      gallery: photos.map(selectionFor),
      ...(entry.source === 'campus-cats' ? { tagIds: resolvedTagIds } : {}),
    };
    const result =
      entry.source === 'campus-cats'
        ? await appModules.catalog.update(actor, entry.id, localUpdate)
        : entry.linkedLocalCatalogId
          ? await appModules.catalog.update(
              actor,
              entry.linkedLocalCatalogId,
              localUpdate,
            )
          : await appModules.inaturalist.updateCatalog(
              actor,
              entry.sourceId,
              overrides,
            );
    if (!result.ok) {
      setBusy(false);
      setError(result.error.message);
      return;
    }
    if (entry.source === 'inaturalist') {
      const assignmentResult = await appModules.catalogTags.assign(
        actor,
        entry.id,
        resolvedTagIds,
      );
      if (!assignmentResult.ok) {
        setBusy(false);
        setError(assignmentResult.error.message);
        return;
      }
    }
    setBusy(false);
    router.replace({
      pathname: '/catalog/view-entry',
      params: { id: entry.id },
    });
  };
  const confirmDelete = () => {
    if (!entry || busy) return;
    const imported = entry.source === 'inaturalist';
    Alert.alert(
      imported ? 'Hide Imported Profile' : 'Delete Catalog Entry',
      imported
        ? 'Hide this iNaturalist profile from members? The source record will be retained.'
        : 'Delete this entry forever?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: imported ? 'Hide Profile' : 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            const operation = imported
              ? appModules.inaturalist.setVisibility(
                  parseUser(user),
                  'catalog',
                  entry.sourceId,
                  false,
                  'Hidden by an officer from the catalog editor',
                )
              : appModules.catalog.remove(parseUser(user), entry.id);
            void operation.then((result) => {
              setBusy(false);
              if (result.ok) router.replace('/catalog');
              else setError(result.error.message);
            });
          },
        },
      ],
    );
  };

  if (!entry && !loadError) {
    return (
      <Screen scroll>
        <AppHeader
          title="Edit catalog entry"
          eyebrow="Campus field guide"
          onBack={() => router.back()}
          action={
            <RestrictedAccess policy={roleAccessPolicies.manageCatalog} />
          }
        />
        <FormSkeleton label="Loading catalog form" fields={6} />
      </Screen>
    );
  }
  if (!entry) {
    return (
      <Screen>
        <AppHeader
          title="Edit catalog entry"
          onBack={() => router.back()}
          action={
            <RestrictedAccess policy={roleAccessPolicies.manageCatalog} />
          }
        />
        <ErrorState
          title="Could not load entry"
          message={loadError || 'Catalog entry not found'}
        />
      </Screen>
    );
  }
  return (
    <FormScreen
      title="Edit catalog entry"
      eyebrow="Campus field guide"
      access={{ policy: roleAccessPolicies.manageCatalog, role: user.role }}
      saveLabel="Save Entry"
      savingLabel="Saving entry…"
      busy={busy}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
      onBack={() => router.back()}
      onSave={() => void save()}
      onDelete={confirmDelete}
      deleteLabel={
        entry.source === 'inaturalist'
          ? 'Hide Imported Profile'
          : 'Delete Catalog Entry'
      }
    >
      <CatalogForm
        formData={formData}
        setFormData={setFormData}
        pickers={pickers}
        photos={photos}
        profile={profile}
        setPhotos={setPhotos}
        onPromotePhoto={promotePhoto}
        onDeletePhoto={removePhoto}
        sourceManaged={sourceManaged}
        availableTags={availableTags}
        selectedTagIds={resolvedTagIds}
        onSelectedTagIdsChange={setSelectedTagIds}
        errors={validation.errors}
        onSectionLayout={validation.onSectionLayout}
        onRequiredFieldLayout={validation.onRequiredFieldLayout}
      />
    </FormScreen>
  );
};

export default EditEntry;
