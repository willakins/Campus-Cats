import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { getDomain } from 'tldts';
import tzLookup from 'tz-lookup';

export interface StoredUniversity {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly websiteDomain?: string;
  readonly emailDomains: readonly string[];
  readonly latitude?: number;
  readonly longitude?: number;
  readonly timezone?: string;
  readonly aliases: readonly string[];
  readonly active: boolean;
}

export interface UniversitySearchResult {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly emailDomains: readonly string[];
  readonly timezone?: string;
  readonly status: 'unclaimed' | 'pending' | 'mapped';
  readonly club?: {
    readonly id: string;
    readonly name: string;
    readonly emailEnabled: true;
    readonly saml?: {
      readonly provider: 'gt-sso';
      readonly label: string;
    };
  };
}

interface ScorecardPage {
  readonly metadata?: { readonly total?: number; readonly page?: number };
  readonly results?: readonly Record<string, unknown>[];
}

type ScorecardFetch = (
  url: string,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export interface UniversityOverride {
  readonly aliases?: readonly string[];
  readonly emailDomains?: readonly string[];
}

const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.school_url',
  'location.lat',
  'location.lon',
].join(',');

export const MAX_SEARCH_CANDIDATES = 200;
const SEARCH_RESULT_LIMIT = 20;

export class UniversityCatalogService {
  constructor(
    private readonly firestore: Firestore,
    private readonly apiKey: () => string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async sync(): Promise<{ readonly synchronized: number }> {
    const overrides = await this.loadOverrides();
    const results = await fetchScorecardCatalog(
      this.fetcher,
      (page) => this.scorecardUrl(page),
    );
    const universities = results.flatMap((result) => {
      const normalized = normalizeScorecardSchool(result);
      if (!normalized) return [];
      return [applyUniversityOverride(normalized, overrides.get(normalized.id))];
    });

    const synchronizedAt = Timestamp.fromDate(this.now());
    for (let offset = 0; offset < universities.length; offset += 400) {
      const batch = this.firestore.batch();
      universities.slice(offset, offset + 400).forEach((university) => {
        batch.set(
          this.firestore.collection('universities').doc(university.id),
          {
            ...university,
            searchPrefixes: universitySearchPrefixes(
              university.name,
              university.aliases,
            ),
            source: 'college_scorecard',
            synchronizedAt,
          },
          { merge: true },
        );
      });
      await batch.commit();
    }
    await this.markMissingInactive(new Set(universities.map(({ id }) => id)), synchronizedAt);
    return { synchronized: universities.length };
  }

  async search(rawQuery: string): Promise<readonly UniversitySearchResult[]> {
    const query = normalizeSearch(rawQuery);
    if (query.length < 2) return [];
    const universities = this.firestore.collection('universities');
    const mappings = this.firestore.collection('university-clubs');
    const [candidateSnapshot, mappingSnapshot] = await Promise.all([
      universities
        .where('searchPrefixes', 'array-contains', universitySearchPrefix(query))
        .limit(MAX_SEARCH_CANDIDATES)
        .get(),
      mappings.get(),
    ]);
    const mappedClubs = new Map(mappingSnapshot.docs.flatMap((document) => {
      const club = mappedClub(document.data());
      return club ? [[document.id, club] as const] : [];
    }));
    const mappedUniversitySnapshots = mappedClubs.size > 0
      ? await this.firestore.getAll(
        ...[...mappedClubs.keys()].map((id) => universities.doc(id)),
      )
      : [];
    const candidates = new Map<string, StoredUniversity>();
    [...candidateSnapshot.docs, ...mappedUniversitySnapshots].forEach((document) => {
      if (!document.exists) return;
      const university = storedUniversity(document.id, document.data());
      if (university && (university.active || mappedClubs.has(university.id))) {
        candidates.set(university.id, university);
      }
    });
    const ranked = [...rankUniversities(query, [...candidates.values()])]
      .sort((left, right) =>
        Number(mappedClubs.has(right.id)) - Number(mappedClubs.has(left.id)))
      .slice(0, SEARCH_RESULT_LIMIT);
    const claims = ranked.length > 0
      ? await this.firestore.getAll(
        ...ranked.map(({ id }) =>
          this.firestore.collection('university-club-claims').doc(id)),
      )
      : [];
    return ranked.map((university, index) => this.discoveryResult(
      university,
      mappedClubs.get(university.id),
      claims[index],
    ));
  }

  async get(universityId: string): Promise<UniversitySearchResult | undefined> {
    const snapshot = await this.firestore
      .collection('universities')
      .doc(universityId)
      .get();
    if (!snapshot.exists) return undefined;
    const university = storedUniversity(snapshot.id, snapshot.data());
    if (!university) return undefined;
    const discovered = await this.discovery(university);
    return universityCanResolve(university, discovered) ? discovered : undefined;
  }

  private async discovery(
    university: StoredUniversity,
  ): Promise<UniversitySearchResult> {
    const [mapping, claim] = await Promise.all([
      this.firestore.collection('university-clubs').doc(university.id).get(),
      this.firestore.collection('university-club-claims').doc(university.id).get(),
    ]);
    return this.discoveryResult(university, mappedClub(mapping.data()), claim);
  }

  private discoveryResult(
    university: StoredUniversity,
    club: NonNullable<UniversitySearchResult['club']> | undefined,
    claim: { readonly exists: boolean; data(): Record<string, unknown> | undefined } | undefined,
  ): UniversitySearchResult {
    if (club) return { ...publicUniversity(university), status: 'mapped', club };
    const expiresAt = claim?.data()?.expiresAt;
    const pending = claim?.exists === true &&
      expiresAt instanceof Timestamp &&
      expiresAt.toDate().getTime() > this.now().getTime();
    return { ...publicUniversity(university), status: pending ? 'pending' : 'unclaimed' };
  }

  private async loadOverrides(): Promise<Map<string, UniversityOverride>> {
    const snapshot = await this.firestore.collection('university-overrides').get();
    return new Map(snapshot.docs.map((document) => {
      const data = document.data();
      return [
        document.id,
        {
          aliases: strings(data.aliases, 40),
          ...('emailDomains' in data
            ? {
                emailDomains: strings(data.emailDomains, 12)
                  .map(normalizeDomain)
                  .filter((value): value is string => Boolean(value)),
              }
            : {}),
        },
      ];
    }));
  }

  private async markMissingInactive(
    synchronizedIds: ReadonlySet<string>,
    synchronizedAt: Timestamp,
  ): Promise<void> {
    const active = await this.firestore
      .collection('universities')
      .where('active', '==', true)
      .get();
    const missing = active.docs.filter(({ id }) => !synchronizedIds.has(id));
    for (let offset = 0; offset < missing.length; offset += 400) {
      const batch = this.firestore.batch();
      missing.slice(offset, offset + 400).forEach((document) => {
        batch.set(document.ref, { active: false, synchronizedAt }, { merge: true });
      });
      await batch.commit();
    }
  }

  private scorecardUrl(page: number): string {
    const parameters = new URLSearchParams({
      api_key: this.apiKey(),
      'school.operating': '1',
      fields: FIELDS,
      page: String(page),
      per_page: '100',
    });
    return `https://api.data.gov/ed/collegescorecard/v1/schools?${parameters}`;
  }
}

export const fetchScorecardCatalog = async (
  fetcher: ScorecardFetch,
  urlForPage: (page: number) => string,
): Promise<readonly Record<string, unknown>[]> => {
  const results: Record<string, unknown>[] = [];
  let page = 0;
  let total: number | undefined;
  while (total === undefined || results.length < total) {
    const response = await fetcher(urlForPage(page));
    if (!response.ok) {
      throw new Error(`College Scorecard returned ${response.status}`);
    }
    const payload = await response.json() as ScorecardPage;
    const reportedTotal = finiteNumber(payload.metadata?.total);
    if (
      !Array.isArray(payload.results) ||
      reportedTotal === undefined ||
      !Number.isSafeInteger(reportedTotal) ||
      reportedTotal < 0
    ) {
      throw new Error('College Scorecard returned malformed pagination data');
    }
    if (total !== undefined && total !== reportedTotal) {
      throw new Error('College Scorecard changed its result count during pagination');
    }
    total = reportedTotal;
    results.push(...payload.results);
    if (results.length < total && payload.results.length !== 100) {
      throw new Error(
        `College Scorecard pagination ended early (${results.length} of ${total} institutions)`,
      );
    }
    page += 1;
  }
  return results.slice(0, total);
};

export const normalizeScorecardSchool = (
  value: Record<string, unknown>,
): StoredUniversity | undefined => {
  const id = integer(value.id);
  const name = requiredString(value['school.name']);
  const city = requiredString(value['school.city']);
  const state = requiredString(value['school.state']);
  if (id === undefined || !name || !city || !state || state.length !== 2) {
    return undefined;
  }
  const latitude = finiteNumber(value['location.lat']);
  const longitude = finiteNumber(value['location.lon']);
  const websiteDomain = approvedDomainFromWebsite(value['school.school_url']);
  let timezone: string | undefined;
  if (latitude !== undefined && longitude !== undefined) {
    try {
      timezone = tzLookup(latitude, longitude);
    } catch {
      timezone = undefined;
    }
  }
  return {
    id: String(id),
    name,
    city,
    state: state.toUpperCase(),
    ...(websiteDomain ? { websiteDomain } : {}),
    emailDomains: websiteDomain ? [websiteDomain] : [],
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(timezone ? { timezone } : {}),
    aliases: [],
    active: true,
  };
};

export const approvedDomainFromWebsite = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    const hostname = normalizeDomain(parsed.hostname);
    if (!hostname) return undefined;
    return normalizeDomain(getDomain(hostname) ?? '');
  } catch {
    return undefined;
  }
};

export const universitySearchPrefixes = (
  name: string,
  aliases: readonly string[],
): readonly string[] => {
  const tokens = [name, ...aliases]
    .flatMap((value) => normalizeSearch(value).split(' '))
    .filter((value) => value.length >= 2);
  const prefixes = new Set<string>();
  tokens.forEach((token) => {
    for (let length = 2; length <= token.length && prefixes.size < 200; length += 1) {
      prefixes.add(token.slice(0, length));
    }
  });
  return [...prefixes].sort();
};

const GENERIC_UNIVERSITY_SEARCH_TERMS = new Set([
  'campus',
  'college',
  'institute',
  'school',
  'state',
  'the',
  'university',
]);

export const universitySearchPrefix = (query: string): string => {
  const terms = normalizeSearch(query)
    .split(' ')
    .filter((term) => term.length >= 2);
  const specificTerms = terms.filter(
    (term) => !GENERIC_UNIVERSITY_SEARCH_TERMS.has(term),
  );
  return (specificTerms.length > 0 ? specificTerms : terms).reduce(
    (longest, term) => term.length > longest.length ? term : longest,
    '',
  );
};

export const rankUniversities = <T extends Pick<StoredUniversity, 'id' | 'name' | 'city' | 'state' | 'aliases'>>(
  query: string,
  universities: readonly T[],
): readonly T[] => {
  const normalized = normalizeSearch(query);
  const terms = normalized.split(' ');
  const score = (university: T): number => {
    const name = normalizeSearch(university.name);
    const aliases = university.aliases.map(normalizeSearch);
    const searchable = `${name} ${aliases.join(' ')} ${normalizeSearch(university.city)} ${university.state.toLowerCase()}`;
    if (!terms.every((term) => searchable.includes(term))) return -1;
    if (aliases.includes(normalized)) return 1000;
    if (name === normalized) return 900;
    if (name.startsWith(normalized) || aliases.some((alias) => alias.startsWith(normalized))) return 700;
    return 500 - name.length;
  };
  return universities
    .map((university) => ({ university, score: score(university) }))
    .filter(({ score: value }) => value >= 0)
    .sort((left, right) => right.score - left.score || left.university.name.localeCompare(right.university.name))
    .map(({ university }) => university);
};

export const universityCanResolve = (
  university: Pick<StoredUniversity, 'active'>,
  discovery: Pick<UniversitySearchResult, 'status'>,
): boolean => university.active || discovery.status === 'mapped';

export const applyUniversityOverride = (
  university: StoredUniversity,
  override: UniversityOverride | undefined,
): StoredUniversity => ({
  ...university,
  aliases: override?.aliases ?? university.aliases,
  emailDomains: override?.emailDomains !== undefined
    ? override.emailDomains
    : university.emailDomains,
});

const publicUniversity = (university: StoredUniversity) => ({
  id: university.id,
  name: university.name,
  city: university.city,
  state: university.state,
  emailDomains: university.emailDomains,
  ...(university.timezone ? { timezone: university.timezone } : {}),
});

const mappedClub = (
  value: Record<string, unknown> | undefined,
): NonNullable<UniversitySearchResult['club']> | undefined => {
  if (
    typeof value?.clubId !== 'string' ||
    typeof value.clubName !== 'string'
  ) return undefined;
  const saml = value.samlProvider === 'gt-sso'
    ? {
        provider: 'gt-sso' as const,
        label: String(value.samlLabel ?? 'Georgia Tech SSO'),
      }
    : undefined;
  return {
    id: value.clubId,
    name: value.clubName,
    emailEnabled: true,
    ...(saml ? { saml } : {}),
  };
};

const storedUniversity = (
  id: string,
  value: Record<string, unknown> | undefined,
): StoredUniversity | undefined => {
  const name = requiredString(value?.name);
  const city = requiredString(value?.city);
  const state = requiredString(value?.state);
  if (!name || !city || !state) return undefined;
  return {
    id,
    name,
    city,
    state,
    emailDomains: strings(value?.emailDomains, 12),
    aliases: strings(value?.aliases, 40),
    active: value?.active === true,
    ...(typeof value?.websiteDomain === 'string' ? { websiteDomain: value.websiteDomain } : {}),
    ...(typeof value?.latitude === 'number' ? { latitude: value.latitude } : {}),
    ...(typeof value?.longitude === 'number' ? { longitude: value.longitude } : {}),
    ...(typeof value?.timezone === 'string' ? { timezone: value.timezone } : {}),
  };
};

const normalizeSearch = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const normalizeDomain = (value: string): string | undefined => {
  const normalized = value.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  return /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(normalized)
    ? normalized
    : undefined;
};

const requiredString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const integer = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
};

const strings = (value: unknown, limit: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .slice(0, limit)
      .map((item) => item.trim())
    : [];
