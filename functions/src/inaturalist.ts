export const INATURALIST_PROJECT_ID = 149475;
export const INATURALIST_GUIDE_ID = 18800;
export const INATURALIST_CAT_FIELD_ID = 16302;

export type ImportQualityGrade = 'casual' | 'needs_id' | 'research';
export type ImportMediaRole = 'profile' | 'gallery';

export interface ExternalMediaImport {
  readonly kind: 'external';
  readonly id: string;
  readonly url: string;
  readonly thumbnailUrl: string;
  readonly role: ImportMediaRole;
  readonly sourceUrl: string;
  readonly attribution: string;
  readonly licenseCode: string;
  readonly licenseUrl: string;
}

export interface ImportModeration {
  readonly hidden: boolean;
  readonly reason: string;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
}

export interface ObservationImport {
  readonly schemaVersion: 1;
  readonly id: number;
  readonly uuid: string;
  readonly projectId: number;
  readonly sourceUrl: string;
  readonly sourceUpdatedAt: Date;
  readonly observedAt: Date;
  readonly observedOn: string;
  readonly observedTimePrecision: 'exact' | 'date';
  readonly displayName: string;
  readonly description: string;
  readonly qualityGrade: ImportQualityGrade;
  readonly observer: Readonly<{
    id: number;
    login: string;
    displayName?: string;
  }>;
  readonly location: Readonly<{
    latitude: number;
    longitude: number;
  }> | null;
  readonly positionalAccuracy: number | null;
  readonly observationFieldValue?: string;
  readonly guideTaxonId?: number;
  readonly observationLicenseCode?: string;
  readonly photos: readonly ExternalMediaImport[];
  readonly sourceActive: boolean;
  readonly visible: boolean;
  readonly importedAt: Date;
  readonly syncedAt: Date;
  readonly lastSeenRunId: string;
  readonly moderation: ImportModeration;
}

export interface CatalogMetadataImport {
  readonly yearsRecorded: readonly string[];
  readonly areasOfResidence: readonly string[];
  readonly currentStatus?:
    | 'Feral'
    | 'Adopted'
    | 'Deceased'
    | 'Frat Cat'
    | 'Unknown';
  readonly furLength?: 'Short' | 'Medium' | 'Long' | 'Unknown';
  readonly furPatterns: readonly string[];
  readonly tnr?: 'Yes' | 'No' | 'Unknown';
  readonly sex?: 'Male' | 'Female' | 'Unknown';
}

export interface CatalogImport {
  readonly schemaVersion: 1;
  readonly id: number;
  readonly guideId: number;
  readonly sourceUrl: string;
  readonly sourceUpdatedAt: Date;
  readonly displayName: string;
  readonly shortDescription: string;
  readonly metadata: CatalogMetadataImport;
  readonly photos: readonly ExternalMediaImport[];
  readonly sourceActive: boolean;
  readonly visible: boolean;
  readonly importedAt: Date;
  readonly syncedAt: Date;
  readonly lastSeenRunId: string;
  readonly moderation: ImportModeration;
  readonly overrides: Readonly<Record<string, unknown>>;
  readonly linkedLocalCatalogId?: string;
  readonly matchStatus: 'unlinked' | 'linked' | 'ambiguous';
}

export interface ImportPage {
  readonly results: readonly unknown[];
  readonly hasMore: boolean;
}

export interface InaturalistGateway {
  listGuideTaxa(): Promise<readonly unknown[]>;
  listObservations(afterId?: number): Promise<ImportPage>;
}

interface HttpHeaders {
  get(name: string): string | null;
}

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: HttpHeaders;
  json(): Promise<unknown>;
}

interface HttpRequestInit {
  readonly headers: Record<string, string>;
  readonly signal?: AbortSignal;
}

class NonRetryableRequestError extends Error {}

export interface InaturalistHttpGatewayOptions {
  readonly fetch: (url: string, init: HttpRequestInit) => Promise<HttpResponse>;
  readonly sleep: (milliseconds: number) => Promise<void>;
}

const OBSERVATION_FIELDS =
  '(id:!t,uuid:!t,updated_at:!t,time_observed_at:!t,observed_on:!t,' +
  'description:!t,quality_grade:!t,license_code:!t,positional_accuracy:!t,' +
  'geojson:(coordinates:!t,type:!t),ofvs:(field_id:!t,value:!t),' +
  'photos:(id:!t,url:!t,license_code:!t,attribution:!t),' +
  'user:(id:!t,login:!t,name:!t))';

export class InaturalistHttpGateway implements InaturalistGateway {
  private hasRequested = false;

  constructor(
    private readonly options: InaturalistHttpGatewayOptions = {
      fetch: (url, init) => fetch(url, init),
      sleep: (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)),
    },
  ) {}

  async listGuideTaxa(): Promise<readonly unknown[]> {
    const url = new URL('https://www.inaturalist.org/guide_taxa.json');
    url.searchParams.set('guide_id', String(INATURALIST_GUIDE_ID));
    const payload = record(
      await this.requestJson(url.toString()),
      'guide response',
    );
    return array(payload.guide_taxa, 'guide response.guide_taxa');
  }

  async listObservations(afterId?: number): Promise<ImportPage> {
    const url = new URL('https://api.inaturalist.org/v2/observations');
    url.searchParams.set('project_id', String(INATURALIST_PROJECT_ID));
    url.searchParams.set('per_page', '200');
    url.searchParams.set('order_by', 'id');
    url.searchParams.set('order', 'asc');
    url.searchParams.set('fields', OBSERVATION_FIELDS);
    if (afterId !== undefined) url.searchParams.set('id_above', String(afterId));
    const payload = record(
      await this.requestJson(url.toString()),
      'observation response',
    );
    const results = array(payload.results, 'observation response.results');
    return { results, hasMore: results.length === 200 };
  }

  private async requestJson(url: string): Promise<unknown> {
    let lastFailure: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (this.hasRequested) await this.options.sleep(1000);
      this.hasRequested = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const response = await this.options.fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'Campus-Cats/1.0 (Georgia Tech Campus Cats iNaturalist importer)',
          },
          signal: controller.signal,
        });
        if (response.ok) return await response.json();
        lastFailure = new Error(`iNaturalist returned HTTP ${response.status}`);
        if (
          attempt < 2 &&
          (response.status === 429 || response.status >= 500)
        ) {
          const retryAfter = Number(response.headers.get('Retry-After'));
          await this.options.sleep(
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : 1000 * 2 ** attempt,
          );
          continue;
        }
        throw new NonRetryableRequestError(lastFailure.message);
      } catch (error) {
        lastFailure =
          error instanceof Error ? error : new Error('iNaturalist request failed');
        if (error instanceof NonRetryableRequestError) throw error;
        if (attempt >= 2) throw lastFailure;
        await this.options.sleep(1000 * 2 ** attempt);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastFailure ?? new Error('iNaturalist request failed');
  }
}

export interface UpsertCounts {
  readonly created: number;
  readonly updated: number;
}

export interface ImportRepository {
  acquireLease(runId: string, now: Date, leaseUntil: Date): Promise<boolean>;
  releaseLease(runId: string): Promise<void>;
  listGuideNames(): Promise<
    readonly Readonly<{
      id: number;
      displayName: string;
      linkedLocalCatalogId?: string;
    }>[]
  >;
  listLocalCatalogEntries(): Promise<
    readonly Readonly<{ id: string; name: string }>[]
  >;
  upsertObservations(
    values: readonly ObservationImport[],
  ): Promise<UpsertCounts>;
  upsertCatalog(values: readonly CatalogImport[]): Promise<UpsertCounts>;
  deactivateMissingObservations(
    seen: ReadonlySet<number>,
    now: Date,
  ): Promise<number>;
  deactivateMissingCatalog(
    seen: ReadonlySet<number>,
    now: Date,
  ): Promise<number>;
  completeRun(summary: SyncRunSummary): Promise<void>;
}

export interface ImportClock {
  now(): Date;
}

export interface SourceSyncSummary {
  readonly fetched: number;
  readonly created: number;
  readonly updated: number;
  readonly deactivated: number;
  readonly errors: readonly string[];
}

export interface SyncRunSummary {
  readonly status: 'success' | 'partial' | 'failed' | 'skipped';
  readonly runId: string;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly observations: SourceSyncSummary;
  readonly catalog: SourceSyncSummary;
  readonly ambiguousCatalogMatches: readonly number[];
}

interface SyncDependencies {
  readonly gateway: InaturalistGateway;
  readonly repository: ImportRepository;
  readonly clock: ImportClock;
  readonly runId: () => string;
}

interface MutableSourceSummary {
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: string[];
}

export async function runInaturalistSync(
  dependencies: SyncDependencies,
): Promise<SyncRunSummary> {
  const startedAt = dependencies.clock.now();
  const runId = dependencies.runId();
  const emptySummary = (): MutableSourceSummary => ({
    fetched: 0,
    created: 0,
    updated: 0,
    deactivated: 0,
    errors: [],
  });
  const observations = emptySummary();
  const catalog = emptySummary();
  const leaseUntil = new Date(startedAt.getTime() + 15 * 60 * 1000);
  const acquired = await dependencies.repository.acquireLease(
    runId,
    startedAt,
    leaseUntil,
  );
  if (!acquired) {
    return {
      status: 'skipped',
      runId,
      startedAt,
      completedAt: dependencies.clock.now(),
      observations,
      catalog,
      ambiguousCatalogMatches: [],
    };
  }

  const ambiguousCatalogMatches: number[] = [];
  let guideIndex = new Map<string, number>();
  try {
    try {
      const rawGuideTaxa = await dependencies.gateway.listGuideTaxa();
      const mapped = rawGuideTaxa.map((value) =>
        mapGuideTaxon(value, startedAt, runId),
      );
      const linked = await linkCatalogProfiles(
        mapped,
        dependencies.repository,
        ambiguousCatalogMatches,
      );
      catalog.fetched = linked.length;
      const counts = await dependencies.repository.upsertCatalog(linked);
      catalog.created += counts.created;
      catalog.updated += counts.updated;
      catalog.deactivated =
        await dependencies.repository.deactivateMissingCatalog(
          new Set(linked.map(({ id }) => id)),
          startedAt,
        );
      guideIndex = uniqueGuideIndex(linked);
    } catch (error) {
      catalog.errors.push(errorMessage(error));
      guideIndex = uniqueGuideIndex(
        await dependencies.repository.listGuideNames(),
      );
    }

    try {
      const seen = new Set<number>();
      let afterId: number | undefined;
      for (;;) {
        const page = await dependencies.gateway.listObservations(afterId);
        if (page.hasMore && page.results.length === 0) {
          throw new Error('iNaturalist returned an empty non-terminal page');
        }
        const mapped = page.results.map((value) =>
          mapObservation(value, guideIndex, startedAt, runId),
        );
        for (const item of mapped) seen.add(item.id);
        observations.fetched += mapped.length;
        if (mapped.length > 0) {
          const counts =
            await dependencies.repository.upsertObservations(mapped);
          observations.created += counts.created;
          observations.updated += counts.updated;
        }
        if (!page.hasMore) break;
        const nextAfter = Math.max(...mapped.map(({ id }) => id));
        if (afterId !== undefined && nextAfter <= afterId) {
          throw new Error('iNaturalist observation cursor did not advance');
        }
        afterId = nextAfter;
      }
      observations.deactivated =
        await dependencies.repository.deactivateMissingObservations(
          seen,
          startedAt,
        );
    } catch (error) {
      observations.errors.push(errorMessage(error));
    }

    const sourcesWithErrors = Number(observations.errors.length > 0) +
      Number(catalog.errors.length > 0);
    const summary: SyncRunSummary = {
      status:
        sourcesWithErrors === 0
          ? 'success'
          : sourcesWithErrors === 1
            ? 'partial'
            : 'failed',
      runId,
      startedAt,
      completedAt: dependencies.clock.now(),
      observations,
      catalog,
      ambiguousCatalogMatches,
    };
    await dependencies.repository.completeRun(summary);
    return summary;
  } finally {
    await dependencies.repository.releaseLease(runId);
  }
}

async function linkCatalogProfiles(
  profiles: readonly CatalogImport[],
  repository: ImportRepository,
  ambiguous: number[],
): Promise<readonly CatalogImport[]> {
  const [locals, existing] = await Promise.all([
    repository.listLocalCatalogEntries(),
    repository.listGuideNames(),
  ]);
  const localByName = groupByNormalizedName(locals);
  const importedByName = groupByNormalizedName(
    profiles.map(({ id, displayName }) => ({ id: String(id), name: displayName })),
  );
  const existingById = new Map(existing.map((value) => [value.id, value]));

  return profiles.map((profile) => {
    const previous = existingById.get(profile.id);
    if (previous?.linkedLocalCatalogId) {
      return {
        ...profile,
        linkedLocalCatalogId: previous.linkedLocalCatalogId,
        matchStatus: 'linked',
      };
    }
    const key = normalizeCatName(profile.displayName);
    const localMatches = localByName.get(key) ?? [];
    const importedMatches = importedByName.get(key) ?? [];
    if (localMatches.length === 1 && importedMatches.length === 1) {
      return {
        ...profile,
        linkedLocalCatalogId: localMatches[0].id,
        matchStatus: 'linked',
      };
    }
    if (localMatches.length > 0 && (localMatches.length > 1 || importedMatches.length > 1)) {
      ambiguous.push(profile.id);
      return { ...profile, matchStatus: 'ambiguous' };
    }
    return profile;
  });
}

function groupByNormalizedName<T extends { readonly id: string; readonly name: string }>(
  values: readonly T[],
): Map<string, readonly T[]> {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const key = normalizeCatName(value.name);
    result.set(key, [...(result.get(key) ?? []), value]);
  }
  return result;
}

function uniqueGuideIndex(
  profiles: readonly Readonly<{ id: number; displayName: string }>[],
): Map<string, number> {
  const grouped = new Map<string, number[]>();
  for (const profile of profiles) {
    const key = normalizeCatName(profile.displayName);
    grouped.set(key, [...(grouped.get(key) ?? []), profile.id]);
  }
  return new Map(
    [...grouped].flatMap(([key, ids]) =>
      ids.length === 1 ? [[key, ids[0]] as const] : [],
    ),
  );
}

export function mapObservation(
  value: unknown,
  guideByName: ReadonlyMap<string, number>,
  now: Date,
  runId: string,
): ObservationImport {
  const data = record(value, 'observation');
  const id = positiveInteger(data.id, 'observation.id');
  const uuid = requiredString(data.uuid, 'observation.uuid');
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(uuid)) {
    throw new Error('observation.uuid must be a UUID');
  }
  const sourceUpdatedAt = validDate(data.updated_at, 'observation.updated_at');
  const observedOn = requiredString(data.observed_on, 'observation.observed_on');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observedOn)) {
    throw new Error('observation.observed_on must be an ISO date');
  }
  const exactObservedAt = optionalDate(data.time_observed_at);
  const observedAt = exactObservedAt ?? new Date(`${observedOn}T12:00:00.000Z`);
  if (Number.isNaN(observedAt.getTime())) {
    throw new Error('observation observed date is invalid');
  }
  const qualityGrade = data.quality_grade;
  if (
    qualityGrade !== 'casual' &&
    qualityGrade !== 'needs_id' &&
    qualityGrade !== 'research'
  ) {
    throw new Error('observation.quality_grade is invalid');
  }
  const observerData = record(data.user, 'observation.user');
  const observerDisplayName = optionalString(observerData.name)?.trim();
  const observer = {
    id: positiveInteger(observerData.id, 'observation.user.id'),
    login: requiredString(observerData.login, 'observation.user.login'),
    ...(observerDisplayName ? {displayName: observerDisplayName} : {}),
  };
  const observationFieldValue = observationCatField(data.ofvs);
  const normalizedField = observationFieldValue
    ? normalizeCatName(observationFieldValue)
    : undefined;
  const guideTaxonId = normalizedField && !isGenericCatField(normalizedField)
    ? guideByName.get(normalizedField)
    : undefined;
  const displayName = observationFieldValue
    ? observationFieldValue.replace(/\s*\([^)]*\)\s*$/, '').trim()
    : 'Domestic cat';
  const observationLicenseCode = normalizedLicense(data.license_code);
  const description = isReusableLicense(observationLicenseCode)
    ? optionalString(data.description) ?? ''
    : '';
  const photos = array(data.photos, 'observation.photos')
    .map(mapObservationPhoto)
    .filter((photo): photo is ExternalMediaImport => photo !== undefined)
    .map((photo, index) => ({
      ...photo,
      role: index === 0 ? ('profile' as const) : ('gallery' as const),
    }));

  return {
    schemaVersion: 1,
    id,
    uuid,
    projectId: INATURALIST_PROJECT_ID,
    sourceUrl: `https://www.inaturalist.org/observations/${id}`,
    sourceUpdatedAt,
    observedAt,
    observedOn,
    observedTimePrecision: exactObservedAt ? 'exact' : 'date',
    displayName: displayName || 'Domestic cat',
    description,
    qualityGrade,
    observer,
    location: publicLocation(data.geojson),
    positionalAccuracy: nullableNonnegativeNumber(data.positional_accuracy),
    observationFieldValue,
    guideTaxonId,
    observationLicenseCode,
    photos,
    sourceActive: true,
    visible: true,
    importedAt: new Date(now),
    syncedAt: new Date(now),
    lastSeenRunId: runId,
    moderation: { hidden: false, reason: '' },
  };
}

export function mapGuideTaxon(
  value: unknown,
  now: Date,
  runId: string,
): CatalogImport {
  const data = record(value, 'guide taxon');
  const id = positiveInteger(data.id, 'guide_taxon.id');
  const guideId = positiveInteger(data.guide_id, 'guide_taxon.guide_id');
  const tags = parseGuideTags(array(data.tag_list, 'guide_taxon.tag_list'));
  const photos = array(data.guide_photos, 'guide_taxon.guide_photos')
    .slice()
    .sort((left, right) => guidePhotoPosition(left) - guidePhotoPosition(right))
    .map(mapGuidePhoto)
    .filter((photo): photo is ExternalMediaImport => photo !== undefined)
    .map((photo, index) => ({
      ...photo,
      role: index === 0 ? ('profile' as const) : ('gallery' as const),
    }));

  return {
    schemaVersion: 1,
    id,
    guideId,
    sourceUrl: `https://www.inaturalist.org/guide_taxa/${id}`,
    sourceUpdatedAt: validDate(data.updated_at, 'guide_taxon.updated_at'),
    displayName:
      optionalString(data.display_name)?.trim() || `Unnamed cat #${id}`,
    shortDescription: requiredString(data.name, 'guide_taxon.name'),
    metadata: tags,
    photos,
    sourceActive: true,
    visible: true,
    importedAt: new Date(now),
    syncedAt: new Date(now),
    lastSeenRunId: runId,
    moderation: { hidden: false, reason: '' },
    overrides: {},
    matchStatus: 'unlinked',
  };
}

function parseGuideTags(values: readonly unknown[]): CatalogMetadataImport {
  const tags = new Map<string, string[]>();
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const separator = raw.indexOf('=');
    if (separator < 0) continue;
    const key = raw.slice(0, separator).trim().toLocaleLowerCase('en-US');
    const tagValue = raw.slice(separator + 1).trim();
    if (!tagValue) continue;
    tags.set(key, [...(tags.get(key) ?? []), tagValue]);
  }
  return {
    yearsRecorded: sortedUnique(tags.get('years recorded') ?? []),
    areasOfResidence: sortedUnique(tags.get('area of residence') ?? []),
    currentStatus: catalogStatus(first(tags.get('current status'))),
    furLength: furLength(first(tags.get('fur length'))),
    furPatterns: sortedUnique(tags.get('fur pattern') ?? []),
    tnr: yesNoUnknown(first(tags.get('tnr'))),
    sex: sex(first(tags.get('sex'))),
  };
}

function mapObservationPhoto(value: unknown): ExternalMediaImport | undefined {
  try {
    const data = record(value, 'observation photo');
    const licenseCode = normalizedLicense(data.license_code);
    if (!isReusableLicense(licenseCode)) return undefined;
    const id = positiveInteger(data.id, 'observation photo.id');
    const squareUrl = requiredUrl(data.url, 'observation photo.url');
    return {
      kind: 'external',
      id: `inat-photo-${id}`,
      url: resizePhotoUrl(squareUrl, 'large'),
      thumbnailUrl: resizePhotoUrl(squareUrl, 'small'),
      role: 'gallery',
      sourceUrl: `https://www.inaturalist.org/photos/${id}`,
      attribution: requiredString(data.attribution, 'observation photo.attribution'),
      licenseCode,
      licenseUrl: licenseUrl(licenseCode),
    };
  } catch {
    return undefined;
  }
}

function mapGuidePhoto(value: unknown): ExternalMediaImport | undefined {
  try {
    const data = record(value, 'guide photo');
    const photo = record(data.photo, 'guide photo.photo');
    const licenseCode = normalizedLicense(photo.license_code);
    if (!isReusableLicense(licenseCode)) return undefined;
    const id = positiveInteger(photo.id ?? data.photo_id, 'guide photo.photo.id');
    return {
      kind: 'external',
      id: `inat-photo-${id}`,
      url: requiredUrl(data.large_url, 'guide photo.large_url'),
      thumbnailUrl: requiredUrl(data.small_url, 'guide photo.small_url'),
      role: 'gallery',
      sourceUrl: `https://www.inaturalist.org/photos/${id}`,
      attribution: requiredString(photo.attribution, 'guide photo.photo.attribution'),
      licenseCode,
      licenseUrl:
        optionalUrl(photo.license_url) ?? licenseUrl(licenseCode),
    };
  } catch {
    return undefined;
  }
}

function guidePhotoPosition(value: unknown): number {
  const position = record(value, 'guide photo').position;
  return typeof position === 'number' && Number.isFinite(position)
    ? position
    : Number.MAX_SAFE_INTEGER;
}

function publicLocation(value: unknown): ObservationImport['location'] {
  if (value === null || value === undefined) return null;
  const geojson = record(value, 'observation.geojson');
  const coordinates = array(geojson.coordinates, 'observation.geojson.coordinates');
  const longitude = finiteNumber(coordinates[0], 'observation longitude');
  const latitude = finiteNumber(coordinates[1], 'observation latitude');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('observation coordinates are outside valid bounds');
  }
  return { latitude, longitude };
}

function observationCatField(value: unknown): string | undefined {
  for (const item of array(value, 'observation.ofvs')) {
    const field = record(item, 'observation field value');
    if (field.field_id === INATURALIST_CAT_FIELD_ID) {
      return optionalString(field.value)?.trim() || undefined;
    }
  }
  return undefined;
}

export function normalizeCatName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLocaleLowerCase('en-US')
    .replace(/[\u2018\u2019\u201c\u201d"']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const GENERIC_CAT_FIELDS = new Set([
  'ginger',
  'multiple individuals',
  'unknown',
  'unidentified',
]);

function isGenericCatField(value: string): boolean {
  return GENERIC_CAT_FIELDS.has(value);
}

function normalizedLicense(value: unknown): string | undefined {
  const code = optionalString(value)
    ?.trim()
    .toUpperCase()
    .replace(/_/g, '-');
  return code || undefined;
}

function isReusableLicense(value: string | undefined): value is string {
  return value === 'CC0' || value?.startsWith('CC-BY') === true;
}

function licenseUrl(code: string): string {
  if (code === 'CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  return `https://creativecommons.org/licenses/${code
    .slice(3)
    .toLocaleLowerCase('en-US')}/4.0/`;
}

function resizePhotoUrl(value: string, size: 'large' | 'small'): string {
  return value.replace(/\/(square|thumb|small|medium|large)\./, `/${size}.`);
}

function catalogStatus(value: string | undefined): CatalogMetadataImport['currentStatus'] {
  return value === 'Feral' ||
    value === 'Adopted' ||
    value === 'Deceased' ||
    value === 'Frat Cat' ||
    value === 'Unknown'
    ? value
    : undefined;
}

function furLength(value: string | undefined): CatalogMetadataImport['furLength'] {
  return value === 'Short' || value === 'Medium' || value === 'Long' || value === 'Unknown'
    ? value
    : undefined;
}

function yesNoUnknown(value: string | undefined): CatalogMetadataImport['tnr'] {
  return value === 'Yes' || value === 'No' || value === 'Unknown'
    ? value
    : undefined;
}

function sex(value: string | undefined): CatalogMetadataImport['sex'] {
  return value === 'Male' || value === 'Female' || value === 'Unknown'
    ? value
    : undefined;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function first(values: readonly string[] | undefined): string | undefined {
  return values?.[0];
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

function nullableNonnegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = finiteNumber(value, 'positional accuracy');
  if (parsed < 0) throw new Error('positional accuracy cannot be negative');
  return parsed;
}

function validDate(value: unknown, field: string): Date {
  if (typeof value !== 'string') throw new Error(`${field} must be a date string`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} must be a valid date`);
  return parsed;
}

function optionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('observed timestamp must be a string');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('observed timestamp is invalid');
  return parsed;
}

function requiredUrl(value: unknown, field: string): string {
  const url = requiredString(value, field);
  try {
    return new URL(url).toString();
  } catch {
    throw new Error(`${field} must be a URL`);
  }
}

function optionalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown synchronization failure';
}
