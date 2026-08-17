'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const MAX_SEARCH_CANDIDATES = 200;
const SEARCH_RESULT_LIMIT = 20;
const GENERIC_UNIVERSITY_SEARCH_TERMS = new Set([
  'campus',
  'college',
  'institute',
  'school',
  'state',
  'the',
  'university',
]);

const normalizeSearch = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const universitySearchPrefix = (query) => {
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

const strings = (value, limit) => Array.isArray(value)
  ? value
    .filter((item) => typeof item === 'string' && Boolean(item.trim()))
    .slice(0, limit)
    .map((item) => item.trim())
  : [];

const storedUniversity = (id, value) => {
  const name = typeof value?.name === 'string' ? value.name.trim() : '';
  const city = typeof value?.city === 'string' ? value.city.trim() : '';
  const state = typeof value?.state === 'string' ? value.state.trim() : '';
  if (!name || !city || !state) return undefined;
  return {
    id,
    name,
    city,
    state,
    emailDomains: strings(value.emailDomains, 12),
    aliases: strings(value.aliases, 40),
    active: value.active === true,
    ...(typeof value.timezone === 'string' ? { timezone: value.timezone } : {}),
  };
};

const mappedClub = (value) => {
  if (typeof value?.clubId !== 'string' || typeof value.clubName !== 'string') {
    return undefined;
  }
  const saml = value.samlProvider === 'gt-sso'
    ? {
        provider: 'gt-sso',
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

const publicUniversity = (university) => ({
  id: university.id,
  name: university.name,
  city: university.city,
  state: university.state,
  emailDomains: university.emailDomains,
  ...(university.timezone ? { timezone: university.timezone } : {}),
});

const rankUniversities = (query, universities) => {
  const normalized = normalizeSearch(query);
  const terms = normalized.split(' ');
  const score = (university) => {
    const name = normalizeSearch(university.name);
    const aliases = university.aliases.map(normalizeSearch);
    const searchable = `${name} ${aliases.join(' ')} ${normalizeSearch(university.city)} ${university.state.toLowerCase()}`;
    if (!terms.every((term) => searchable.includes(term))) return -1;
    if (aliases.includes(normalized)) return 1000;
    if (name === normalized) return 900;
    if (name.startsWith(normalized) || aliases.some((alias) => alias.startsWith(normalized))) {
      return 700;
    }
    return 500 - name.length;
  };
  return universities
    .map((university) => ({ university, score: score(university) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score ||
      left.university.name.localeCompare(right.university.name))
    .map(({ university }) => university);
};

const discoveryResult = (university, club, claim, now) => {
  if (club) return { ...publicUniversity(university), status: 'mapped', club };
  const expiresAt = claim?.data()?.expiresAt;
  const pending = claim?.exists === true &&
    expiresAt instanceof Timestamp &&
    expiresAt.toDate().getTime() > now.getTime();
  return {
    ...publicUniversity(university),
    status: pending ? 'pending' : 'unclaimed',
  };
};

const validatedQuery = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', 'query is required');
  }
  const query = value.trim().replace(/\s+/g, ' ');
  return query.length >= 2 && query.length <= 100 ? query : undefined;
};

const validatedUniversityId = (value) => {
  if (typeof value !== 'string' || !/^\d{1,20}$/.test(value.trim())) {
    throw new HttpsError(
      'invalid-argument',
      'Select a university from search results',
    );
  }
  return value.trim();
};

const searchCatalog = async (firestore, rawQuery, now = new Date()) => {
  const query = validatedQuery(rawQuery);
  if (!query) return [];
  const universities = firestore.collection('universities');
  const mappings = firestore.collection('university-clubs');
  const [candidateSnapshot, mappingSnapshot] = await Promise.all([
    universities
      .where('searchPrefixes', 'array-contains', universitySearchPrefix(query))
      .limit(MAX_SEARCH_CANDIDATES)
      .get(),
    mappings.get(),
  ]);
  const mappedClubs = new Map(mappingSnapshot.docs.flatMap((document) => {
    const club = mappedClub(document.data());
    return club ? [[document.id, club]] : [];
  }));
  const mappedUniversitySnapshots = mappedClubs.size > 0
    ? await firestore.getAll(
      ...[...mappedClubs.keys()].map((id) => universities.doc(id)),
    )
    : [];
  const candidates = new Map();
  [...candidateSnapshot.docs, ...mappedUniversitySnapshots].forEach((document) => {
    if (!document.exists) return;
    const university = storedUniversity(document.id, document.data());
    if (university && (university.active || mappedClubs.has(university.id))) {
      candidates.set(university.id, university);
    }
  });
  const ranked = rankUniversities(query, [...candidates.values()])
    .sort((left, right) =>
      Number(mappedClubs.has(right.id)) - Number(mappedClubs.has(left.id)))
    .slice(0, SEARCH_RESULT_LIMIT);
  const claims = ranked.length > 0
    ? await firestore.getAll(...ranked.map(({ id }) =>
      firestore.collection('university-club-claims').doc(id)))
    : [];
  return ranked.map((university, index) => discoveryResult(
    university,
    mappedClubs.get(university.id),
    claims[index],
    now,
  ));
};

const getUniversityCatalog = async (firestore, rawUniversityId, now = new Date()) => {
  const universityId = validatedUniversityId(rawUniversityId);
  const universitySnapshot = await firestore
    .collection('universities')
    .doc(universityId)
    .get();
  if (!universitySnapshot.exists) return null;
  const university = storedUniversity(
    universitySnapshot.id,
    universitySnapshot.data(),
  );
  if (!university) return null;
  const [mapping, claim] = await Promise.all([
    firestore.collection('university-clubs').doc(university.id).get(),
    firestore.collection('university-club-claims').doc(university.id).get(),
  ]);
  const result = discoveryResult(
    university,
    mappedClub(mapping.data()),
    claim,
    now,
  );
  return university.active || result.status === 'mapped' ? result : null;
};

const execute = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('University catalog request failed', error);
    throw new HttpsError(
      'internal',
      'The requested operation could not be completed',
    );
  }
};

const firestore = getFirestore();

exports.searchUniversities = onCall((request) =>
  execute(() => searchCatalog(firestore, request.data?.query)));

exports.getUniversity = onCall((request) =>
  execute(() => getUniversityCatalog(firestore, request.data?.universityId)));

exports.__test = {
  getUniversityCatalog,
  normalizeSearch,
  rankUniversities,
  searchCatalog,
  universitySearchPrefix,
};
