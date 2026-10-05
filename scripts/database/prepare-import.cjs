#!/usr/bin/env node
'use strict';

// Offline preparation only: produces a private SQL file, never connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { argumentsFor } = require('./export-firestore.cjs');

function decode(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) {
    const number = Number(value.integerValue);
    if (!Number.isSafeInteger(number)) throw new Error('Unsafe integer');
    return number;
  }
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  throw new Error('Unsupported Firestore value type');
}
function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decode(value)]),
  );
}
function literal(value) {
  if (value === undefined || value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Nonfinite number');
    return String(value);
  }
  const string =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (string.includes('\0')) throw new Error('NUL in SQL value');
  return "'" + string.replace(/'/g, "''") + "'";
}
const KEYS = {
  'app.clubs': ['id'],
  'app.identities': ['firebase_uid'],
  'app_private.memberships': ['club_id', 'user_id'],
  'app.profiles': ['club_id', 'user_id'],
  'app.profile_achievements': ['club_id', 'user_id', 'achievement_id'],
  'app.catalog': ['club_id', 'id'],
  'app.sightings': ['club_id', 'id'],
  'app_private.contributors': ['club_id', 'kind', 'content_id'],
  'app.stations': ['club_id', 'id'],
  'app.announcements': ['club_id', 'kind', 'id'],
  'app.comments': ['club_id', 'target_kind', 'id'],
  'app.catalog_tags': ['club_id', 'id'],
  'app.catalog_tag_configuration': ['club_id'],
  'app.catalog_tag_sets': ['club_id', 'catalog_id'],
  'app.catalog_tag_assignments': ['club_id', 'catalog_id', 'tag_id'],
  'app.catalog_favorites': ['club_id', 'user_id'],
  'app.announcement_reads': ['club_id', 'kind', 'announcement_id', 'user_id'],
  'app.surveys': ['club_id', 'id'],
  'app.survey_questions': ['club_id', 'survey_id', 'id'],
  'app.survey_options': ['club_id', 'survey_id', 'question_id', 'id'],
  'app.survey_responses': ['club_id', 'survey_id', 'id'],
  'app.survey_answers': ['club_id', 'survey_id', 'response_id', 'question_id'],
  'app.survey_answer_options': [
    'club_id',
    'survey_id',
    'response_id',
    'question_id',
    'option_id',
  ],
  'app_private.survey_receipts': ['club_id', 'survey_id', 'user_id'],
  'app.votes': ['club_id', 'id'],
  'app.vote_options': ['club_id', 'vote_id', 'id'],
  'app.vote_nominees': ['club_id', 'vote_id', 'user_id'],
  'app.vote_ballots': ['club_id', 'vote_id', 'id'],
  'app_private.vote_receipts': ['club_id', 'vote_id', 'user_id'],
  'app.inaturalist_public_links': ['club_id', 'inaturalist_user_id'],
  'app.media_references': ['club_id', 'owner_kind', 'owner_id', 'id'],
  'app_private.import_metadata': ['club_id', 'kind', 'id'],
  'app_private.migration_sources': ['source_project', 'source_path'],
};
function upsert(table, row) {
  const keys = KEYS[table];
  if (!keys) throw new Error('Unsupported SQL table');
  const columns = Object.keys(row);
  if (!columns.every((column) => /^[a-z_]+$/.test(column)))
    throw new Error('Invalid SQL column');
  const updates = columns
    .filter((column) => !keys.includes(column))
    .map((column) => `${column} = excluded.${column}`);
  // Re-imports cannot grant access or overwrite a later live access projection.
  if (table === 'app_private.memberships') updates.length = 0;
  return `insert into ${table} (${columns.join(', ')}) values (${columns.map((column) => literal(row[column])).join(', ')}) on conflict (${keys.join(', ')}) ${updates.length ? 'do update set ' + updates.join(', ') : 'do nothing'};`;
}
function date(value, context) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
    throw new Error(`Invalid ${context} date`);
  return new Date(value).toISOString();
}

function prepare(snapshot, manifest) {
  for (const value of [manifest.project, manifest.club])
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value))
      throw new Error('Invalid source project or club identifier');
  if (
    snapshot.version !== 1 ||
    manifest.version !== 1 ||
    snapshot.project !== manifest.project ||
    snapshot.club !== manifest.club
  ) {
    throw new Error('Export and source manifest must match explicitly');
  }
  const club = manifest.club;
  const selected = new Map();
  const relationshipDocuments = new Map();
  const report = {
    project: snapshot.project,
    club,
    exportedDocuments: snapshot.documents.length,
    selected: {},
    excluded: {},
    rows: {},
    unresolvedSightingLinks: 0,
    restoredCatalogLinks: 0,
    ignoredEmbeddedContributorConflicts: 0,
    consistentSnapshot: snapshot.consistentSnapshot,
    warnings: [
      'Rehearsal only: freeze writers and export again before cutover.',
    ],
  };
  let clubDoc;
  for (const doc of snapshot.documents) {
    const parts = doc.path.split('/');
    if (doc.path === `clubs/${club}`) {
      clubDoc = doc;
      continue;
    }
    const tenant =
      parts.length === 4 && parts[0] === 'clubs' && parts[1] === club;
    const root = parts.length === 2;
    const collection = tenant ? parts[2] : root ? parts[0] : undefined;
    if (!collection)
      throw new Error(
        `Nested collection requires a source mapping: ${doc.path.split('/').slice(0, -1).join('/')}`,
      );
    const source = tenant ? 'tenant' : 'root';
    const configured = manifest.sources[collection];
    if (!configured)
      throw new Error(
        `Nonempty collection needs an explicit source mapping: ${collection}`,
      );
    if (!['root', 'tenant'].includes(configured))
      throw new Error(`Invalid source mapping: ${collection}`);
    const relationshipSource = manifest.relationshipSources?.[collection];
    if (
      relationshipSource &&
      (collection !== 'inaturalist-guide-profiles' ||
        !['root', 'tenant'].includes(relationshipSource))
    ) {
      throw new Error('Unsupported relationship source mapping');
    }
    if (relationshipSource === source) {
      const data = decodeFields(doc.fields);
      if (data.clubId && data.clubId !== club)
        throw new Error('Cross-club relationship source rejected');
      relationshipDocuments.set(parts.at(-1), {
        ...doc,
        id: parts.at(-1),
        data,
      });
    }
    if (configured !== source) {
      report.excluded[`${source}/${collection}`] =
        (report.excluded[`${source}/${collection}`] || 0) + 1;
      continue;
    }
    const data = decodeFields(doc.fields);
    if (collection === 'users' && data.clubId && data.clubId !== club) continue;
    if (data.clubId && data.clubId !== club)
      throw new Error('Cross-club content rejected');
    if (!selected.has(collection)) selected.set(collection, []);
    selected.get(collection).push({ ...doc, id: parts.at(-1), data });
    report.selected[collection] = (report.selected[collection] || 0) + 1;
  }
  if (!clubDoc) throw new Error('Club record missing');
  const sql = [
    'begin;',
    'set local standard_conforming_strings = on;',
    `select pg_advisory_xact_lock(hashtext(${literal('campus-cats-import:' + club)}));`,
  ];
  function add(table, row) {
    sql.push(upsert(table, row));
    report.rows[table] = (report.rows[table] || 0) + 1;
  }
  const identities = new Set();
  function identity(uid) {
    if (typeof uid !== 'string' || !uid)
      throw new Error('Missing Firebase UID');
    if (!identities.has(uid)) {
      add('app.identities', { firebase_uid: uid });
      identities.add(uid);
    }
    return uid;
  }
  function memberIdentity(uid) {
    identity(uid);
    // Imported participation proves a historical club relationship, never live access.
    add('app_private.memberships', {
      club_id: club,
      user_id: uid,
      role: 0,
      access_enabled: false,
    });
    return uid;
  }
  const records = (collection) => selected.get(collection) || [];
  add('app.clubs', {
    id: club,
    name: decodeFields(clubDoc.fields).name,
    firebase_project_id: snapshot.project,
  });
  for (const doc of records('users')) {
    const uid = identity(doc.id);
    add('app_private.memberships', {
      club_id: club,
      user_id: uid,
      role: doc.data.role,
      access_enabled: false,
    });
    provenance(doc, 'app_private.memberships', uid);
  }
  function provenance(doc, table, id) {
    add('app_private.migration_sources', {
      source_project: snapshot.project,
      source_path: doc.path,
      source_update_time: doc.updateTime,
      club_id: club,
      target_table: table,
      target_id: id,
      content_hash: crypto
        .createHash('sha256')
        .update(JSON.stringify(doc.fields))
        .digest('hex'),
    });
  }
  for (const doc of records('public-profiles')) {
    const d = doc.data;
    const uid = identity(doc.id);
    add('app_private.memberships', {
      club_id: club,
      user_id: uid,
      role: d.role,
      access_enabled: false,
    });
    add('app.profiles', {
      club_id: club,
      user_id: uid,
      display_name: d.displayName,
      bio: d.bio || '',
      profile_photo_url: d.profilePhotoUrl || '',
      selected_title_id: d.selectedTitleId || null,
    });
    for (const id of d.achievementIds || [])
      add('app.profile_achievements', {
        club_id: club,
        user_id: uid,
        achievement_id: id,
      });
    provenance(doc, 'app.profiles', uid);
  }
  const contributors = new Map();
  for (const doc of records('content-contributors')) {
    const d = doc.data;
    contributors.set(`${d.kind}/${d.contentId}`, d.user);
  }
  function contributor(kind, id, embedded) {
    const explicit = contributors.get(`${kind}/${id}`);
    if (explicit && embedded && explicit.id !== embedded.id)
      report.ignoredEmbeddedContributorConflicts++;
    const user = explicit || embedded;
    if (user?.clubId && user.clubId !== club)
      throw new Error('Cross-club contributor rejected');
    if (user)
      add('app_private.contributors', {
        club_id: club,
        kind,
        content_id: id,
        user_id: identity(user.id),
      });
  }
  const catalogByName = new Map();
  const catalogIds = new Set();
  for (const doc of records('catalog')) {
    const d = doc.data,
      c = d.cat;
    if (!c || typeof c.name !== 'string')
      throw new Error('Invalid catalog document');
    add('app.catalog', {
      club_id: club,
      id: doc.id,
      source: 'campus-cats',
      name: c.name,
      description_short: c.descShort || '',
      description_long: c.descLong || '',
      color_pattern: c.colorPattern,
      behavior: c.behavior,
      years_recorded: c.yearsRecorded,
      area_of_residence: c.AoR,
      current_status: c.currentStatus,
      fur_length: c.furLength,
      fur_pattern: c.furPattern,
      tnr: c.tnr,
      sex: c.sex,
      credits: d.credits || '',
      created_at: date(d.createdAt, 'catalog'),
    });
    catalogIds.add(doc.id);
    catalogByName.set(c.name, [...(catalogByName.get(c.name) || []), doc.id]);
    contributor('catalog', doc.id, d.createdBy);
    provenance(doc, 'app.catalog', doc.id);
  }
  function importMetadata(doc, kind, id) {
    const d = doc.data;
    add('app_private.import_metadata', {
      club_id: club,
      kind,
      id,
      metadata: Object.fromEntries(
        [
          'uuid',
          'projectId',
          'guideId',
          'moderation',
          'metadata',
          'overrides',
          'importedAt',
          'syncedAt',
          'lastSeenRunId',
          'observationLicenseCode',
          'observationFieldValue',
        ]
          .filter((key) => d[key] !== undefined)
          .map((key) => [key, d[key]]),
      ),
    });
    const cover = d.overrides?.coverPhotoId;
    const photos = cover
      ? [
          ...(d.photos || []).filter((photo) => photo.id === cover),
          ...(d.photos || []).filter((photo) => photo.id !== cover),
        ]
      : d.photos || [];
    photos.forEach((photo, position) => {
      const { id: photoId, url, role, ...metadata } = photo;
      add('app.media_references', {
        club_id: club,
        owner_kind: kind,
        owner_id: id,
        id: photoId,
        [`${kind}_id`]: id,
        kind: 'external',
        url,
        role:
          kind === 'catalog' ? (position === 0 ? 'profile' : 'gallery') : role,
        position,
        metadata,
      });
    });
  }
  for (const doc of records('inaturalist-guide-profiles')) {
    let d = doc.data;
    const relationship = relationshipDocuments.get(doc.id);
    if (relationship?.data.linkedLocalCatalogId) {
      if (
        d.linkedLocalCatalogId &&
        d.linkedLocalCatalogId !== relationship.data.linkedLocalCatalogId
      )
        throw new Error(
          'Conflicting imported catalog relationships require review',
        );
      if (relationship.data.matchStatus !== 'linked')
        throw new Error(
          'Historical catalog relationship is not explicitly linked',
        );
      if (!d.linkedLocalCatalogId) {
        d = {
          ...d,
          linkedLocalCatalogId: relationship.data.linkedLocalCatalogId,
          matchStatus: 'linked',
        };
        report.restoredCatalogLinks++;
      }
    }
    const m = d.metadata || {},
      o = d.overrides || {};
    const id = `inat-guide-${doc.id}`;
    // Keep individual cats separate from guide entries; an explicit source link is required.
    if (d.linkedLocalCatalogId && !catalogIds.has(d.linkedLocalCatalogId))
      throw new Error('Imported catalog link target missing');
    add('app.catalog', {
      club_id: club,
      id,
      source: 'inaturalist',
      source_id: Number(doc.id),
      name: o.name || d.displayName,
      description_short: o.descShort || d.shortDescription,
      description_long: o.descLong || '',
      color_pattern: o.colorPattern ?? (m.furPatterns || []).join(', '),
      behavior: o.behavior,
      years_recorded: o.yearsRecorded ?? (m.yearsRecorded || []).join(', '),
      area_of_residence: o.AoR ?? (m.areasOfResidence || []).join(', '),
      current_status: o.currentStatus || m.currentStatus,
      fur_length: o.furLength || m.furLength,
      fur_pattern: o.furPattern ?? (m.furPatterns || []).join(', '),
      tnr: o.tnr || m.tnr,
      sex: o.sex || m.sex,
      source_url: d.sourceUrl,
      source_updated_at: date(d.sourceUpdatedAt, 'source'),
      linked_local_catalog_id: d.linkedLocalCatalogId,
      match_status: d.matchStatus,
      visible: d.visible,
      source_active: d.sourceActive,
      credits: `iNaturalist Georgia Tech Cats guide: ${d.sourceUrl}`,
    });
    catalogIds.add(id);
    importMetadata(doc, 'catalog', id);
    provenance(doc, 'app.catalog', id);
    if (
      relationship?.data.linkedLocalCatalogId &&
      relationship.path !== doc.path
    )
      provenance(relationship, 'app.catalog', id);
  }
  const sightingIds = new Set();
  for (const doc of records('cat-sightings')) {
    const d = doc.data;
    const matches = catalogByName.get(d.name) || [];
    const catalogId = matches.length === 1 ? matches[0] : null;
    if (!catalogId) report.unresolvedSightingLinks++;
    add('app.sightings', {
      club_id: club,
      id: doc.id,
      source: 'campus-cats',
      catalog_id: catalogId,
      reported_name: d.name,
      info: d.info || '',
      observed_at: date(d.date ?? d.spotted_time, 'sighting'),
      created_at: d.createdAt ? date(d.createdAt, 'sighting creation') : null,
      latitude: d.location?.latitude,
      longitude: d.location?.longitude,
      fed: d.fed,
      healthy: d.health,
      time_of_day: d.timeOfDay ?? d.timeofDay,
    });
    sightingIds.add(doc.id);
    contributor('sighting', doc.id, d.createdBy);
    provenance(doc, 'app.sightings', doc.id);
  }
  for (const doc of records('inaturalist-observations')) {
    const d = doc.data,
      id = `inat-observation-${doc.id}`;
    add('app.sightings', {
      club_id: club,
      id,
      source: 'inaturalist',
      source_id: Number(doc.id),
      reported_name: d.displayName,
      info: d.description || '',
      observed_at: date(d.observedAt, 'observation'),
      latitude: d.location?.latitude,
      longitude: d.location?.longitude,
      observed_on: d.observedOn,
      time_precision: d.observedTimePrecision,
      quality_grade: d.qualityGrade,
      positional_accuracy: d.positionalAccuracy,
      observer_id: d.observer?.id,
      observer_login: d.observer?.login,
      observer_display_name: d.observer?.displayName,
      guide_taxon_id: d.guideTaxonId,
      source_url: d.sourceUrl,
      source_updated_at: date(d.sourceUpdatedAt, 'source'),
      visible: d.visible,
      source_active: d.sourceActive,
    });
    sightingIds.add(id);
    importMetadata(doc, 'sighting', id);
    provenance(doc, 'app.sightings', id);
  }
  for (const doc of records('stations')) {
    const d = doc.data;
    add('app.stations', {
      club_id: club,
      id: doc.id,
      name: d.name,
      latitude: d.location?.latitude,
      longitude: d.location?.longitude,
      last_stocked: date(d.lastStocked, 'station'),
      stocking_frequency: d.stockingFreq,
      known_cats: d.knownCats || '',
    });
    if (d.createdBy)
      add('app_private.import_metadata', {
        club_id: club,
        kind: 'station-author',
        id: doc.id,
        metadata: { userId: identity(d.createdBy.id) },
      });
    provenance(doc, 'app.stations', doc.id);
  }
  for (const doc of records('alerts')) {
    const d = doc.data;
    add('app.announcements', {
      club_id: club,
      id: doc.id,
      kind: 'alert',
      title: d.title,
      details: d.info,
      author_alias: d.authorAlias,
      created_at: date(d.createdAt, 'alert'),
    });
    if (d.createdBy)
      add('app_private.import_metadata', {
        club_id: club,
        kind: 'alert-author',
        id: doc.id,
        metadata: { userId: identity(d.createdBy.id) },
      });
    provenance(doc, 'app.announcements', doc.id);
  }
  for (const collection of [
    'sighting-comments',
    'catalog-comments',
    'station-comments',
  ]) {
    for (const doc of records(collection)) {
      const d = doc.data,
        target = d.target;
      if (!target || !['sighting', 'catalog', 'station'].includes(target.kind))
        throw new Error('Invalid comment target');
      if (target.kind === 'sighting' && !sightingIds.has(target.id))
        throw new Error('Comment sighting missing');
      if (target.kind === 'catalog' && !catalogIds.has(target.id))
        throw new Error('Comment catalog missing');
      add('app.comments', {
        club_id: club,
        id: doc.id,
        target_kind: target.kind,
        target_id: target.id,
        sighting_id: target.kind === 'sighting' ? target.id : null,
        catalog_id: target.kind === 'catalog' ? target.id : null,
        station_id: target.kind === 'station' ? target.id : null,
        source: d.source,
        body: d.body,
        created_at: date(d.createdAt, 'comment'),
        author_user_id: d.createdById ? identity(d.createdById) : null,
        external_author: d.externalAuthor,
        source_metadata: Object.fromEntries(
          [
            'sourceCommentId',
            'sourceCommentUuid',
            'sourceUrl',
            'sourceUpdatedAt',
            'lastSeenRunId',
          ]
            .filter((key) => d[key] !== undefined)
            .map((key) => [key, d[key]]),
        ),
      });
      provenance(doc, 'app.comments', doc.id);
    }
  }
  for (const doc of records('catalog-tag-settings')) {
    add('app.catalog_tag_configuration', { club_id: club });
    for (const tag of doc.data.tags || [])
      add('app.catalog_tags', { club_id: club, id: tag.id, label: tag.label });
    provenance(doc, 'app.catalog_tags', doc.id);
  }
  for (const doc of records('catalog-tag-assignments')) {
    add('app.catalog_tag_sets', {
      club_id: club,
      catalog_id: doc.data.catalogId,
    });
    for (const tagId of doc.data.tagIds || [])
      add('app.catalog_tag_assignments', {
        club_id: club,
        catalog_id: doc.data.catalogId,
        tag_id: tagId,
      });
    provenance(doc, 'app.catalog_tag_assignments', doc.id);
  }
  for (const doc of records('catalog-favorites')) {
    const d = doc.data;
    add('app.catalog_favorites', {
      club_id: club,
      user_id: memberIdentity(d.userId),
      catalog_id: d.catalogId,
      created_at: date(d.createdAt, 'favorite'),
    });
    provenance(doc, 'app.catalog_favorites', doc.id);
  }
  for (const doc of records('community-events')) {
    const d = doc.data;
    add('app.announcements', {
      club_id: club,
      id: doc.id,
      kind: 'event',
      title: d.title,
      details: d.details,
      created_at: date(d.createdAt, 'event'),
      location: d.location,
      starts_at: date(d.startsAt, 'event start'),
      expires_at: date(d.expiresAt, 'event expiry'),
      image_url: d.imageUrl,
    });
    if (d.createdBy)
      add('app_private.import_metadata', {
        club_id: club,
        kind: 'event-author',
        id: doc.id,
        metadata: { userId: identity(d.createdBy.id) },
      });
    provenance(doc, 'app.announcements', doc.id);
  }
  for (const [collection, kind, field] of [
    ['alert-read-receipts', 'alert', 'alertId'],
    ['event-read-receipts', 'event', 'eventId'],
  ]) {
    for (const doc of records(collection)) {
      const d = doc.data;
      add('app.announcement_reads', {
        club_id: club,
        kind,
        announcement_id: d[field],
        user_id: memberIdentity(d.userId),
        read_at: date(d.readAt, 'read receipt'),
      });
      provenance(doc, 'app.announcement_reads', doc.id);
    }
  }
  const surveyQuestions = new Map();
  for (const doc of records('community-surveys')) {
    const d = doc.data;
    add('app.surveys', {
      club_id: club,
      id: doc.id,
      title: d.title,
      details: d.details,
      anonymous: d.anonymous,
      audience: d.participationAudience || 'all_members',
      status: d.status,
      created_at: date(d.createdAt, 'survey'),
      closed_at: d.closedAt ? date(d.closedAt, 'survey close') : null,
    });
    if (!Array.isArray(d.questions) || d.questions.length === 0)
      throw new Error('Survey questions missing');
    d.questions.forEach((q, position) => {
      surveyQuestions.set(`${doc.id}/${q.id}`, q);
      add('app.survey_questions', {
        club_id: club,
        survey_id: doc.id,
        id: q.id,
        position,
        kind: q.type,
        prompt: q.prompt,
      });
      (q.options || []).forEach((o, optionPosition) =>
        add('app.survey_options', {
          club_id: club,
          survey_id: doc.id,
          question_id: q.id,
          id: o.id,
          position: optionPosition,
          label: o.label,
        }),
      );
    });
    if (d.createdBy)
      add('app_private.import_metadata', {
        club_id: club,
        kind: 'survey-author',
        id: doc.id,
        metadata: { userId: identity(d.createdBy.id) },
      });
    provenance(doc, 'app.surveys', doc.id);
  }
  for (const doc of records('survey-responses')) {
    const d = doc.data;
    add('app.survey_responses', {
      club_id: club,
      survey_id: d.surveyId,
      id: doc.id,
      submitted_at: date(d.submittedAt, 'response'),
    });
    for (const answer of d.answers || []) {
      const q = surveyQuestions.get(`${d.surveyId}/${answer.questionId}`);
      if (!q) throw new Error('Survey answer question missing');
      const choice = ['single_choice', 'multi_select'].includes(q.type);
      add('app.survey_answers', {
        club_id: club,
        survey_id: d.surveyId,
        response_id: doc.id,
        question_id: answer.questionId,
        text_value: choice ? null : answer.value,
      });
      if (choice)
        for (const optionId of Array.isArray(answer.value)
          ? answer.value
          : [answer.value]) {
          add('app.survey_answer_options', {
            club_id: club,
            survey_id: d.surveyId,
            response_id: doc.id,
            question_id: answer.questionId,
            option_id: optionId,
          });
        }
    }
    if (d.respondent)
      add('app_private.import_metadata', {
        club_id: club,
        kind: 'survey-respondent',
        id: doc.id,
        metadata: { userId: identity(d.respondent.id) },
      });
    provenance(doc, 'app.survey_responses', doc.id);
  }
  for (const doc of records('survey-submission-receipts')) {
    const d = doc.data;
    add('app_private.survey_receipts', {
      club_id: club,
      survey_id: d.surveyId,
      user_id: memberIdentity(d.userId),
      response_id: d.responseId,
    });
    provenance(doc, 'app_private.survey_receipts', doc.id);
  }
  const votes = new Map();
  for (const doc of records('community-votes')) {
    const d = doc.data;
    votes.set(doc.id, d);
    add('app.votes', {
      club_id: club,
      id: doc.id,
      kind: d.kind,
      title: d.title,
      details: d.details,
      audience: d.participationAudience || 'all_members',
      created_at: date(d.createdAt, 'vote'),
      starts_at: date(d.votingStartsAt, 'vote start'),
      ends_at: date(d.votingEndsAt, 'vote end'),
      nomination_ends_at: d.nominationEndsAt
        ? date(d.nominationEndsAt, 'nomination end')
        : null,
    });
    (d.options || []).forEach((o, position) =>
      add('app.vote_options', {
        club_id: club,
        vote_id: doc.id,
        id: o.id,
        position,
        label: o.label,
        image_url: o.imageUrl,
      }),
    );
    if (d.createdBy || d.votingNotificationSentAt)
      add('app_private.import_metadata', {
        club_id: club,
        kind: 'vote-state',
        id: doc.id,
        metadata: {
          ...(d.createdBy ? { userId: identity(d.createdBy.id) } : {}),
          votingNotificationSentAt: d.votingNotificationSentAt,
        },
      });
    provenance(doc, 'app.votes', doc.id);
  }
  for (const doc of records('community-vote-nominees')) {
    const d = doc.data;
    add('app.vote_nominees', {
      club_id: club,
      vote_id: d.voteId,
      user_id: memberIdentity(d.userId),
      display_name: d.displayName,
      pitch: d.pitch,
      nominated_at: date(d.nominatedAt, 'nomination'),
    });
    provenance(doc, 'app.vote_nominees', doc.id);
  }
  for (const doc of records('community-vote-ballots')) {
    const d = doc.data,
      vote = votes.get(d.voteId);
    if (!vote) throw new Error('Ballot vote missing');
    add('app.vote_ballots', {
      club_id: club,
      vote_id: d.voteId,
      id: doc.id,
      option_id: vote.kind === 'contest' ? d.optionId : null,
      nominee_user_id:
        vote.kind === 'presidential_election' ? d.optionId : null,
      submitted_at: date(d.submittedAt, 'ballot'),
    });
    provenance(doc, 'app.vote_ballots', doc.id);
  }
  for (const doc of records('community-vote-ballot-receipts')) {
    const d = doc.data;
    add('app_private.vote_receipts', {
      club_id: club,
      vote_id: d.voteId,
      user_id: memberIdentity(d.userId),
      ballot_id: d.ballotId,
    });
    provenance(doc, 'app_private.vote_receipts', doc.id);
  }
  for (const doc of records('inaturalist-public-links')) {
    const d = doc.data;
    add('app.inaturalist_public_links', {
      club_id: club,
      inaturalist_user_id: d.inaturalistUserId,
      user_id: memberIdentity(d.userId),
      login: d.login,
      linked_at: date(d.linkedAt, 'public link'),
    });
    provenance(doc, 'app.inaturalist_public_links', doc.id);
  }
  // Private operational receipts/overrides remain private and are never counted as new user activity.
  for (const collection of [
    'community-vote-state',
    'community-vote-nomination-receipts',
    'inaturalist-comment-moderation',
  ]) {
    for (const doc of records(collection)) {
      add('app_private.import_metadata', {
        club_id: club,
        kind: collection,
        id: doc.id,
        metadata: doc.data,
      });
      provenance(doc, 'app_private.import_metadata', doc.id);
    }
  }
  const supported = new Set([
    'users',
    'public-profiles',
    'content-contributors',
    'catalog',
    'cat-sightings',
    'inaturalist-guide-profiles',
    'inaturalist-observations',
    'stations',
    'alerts',
    'sighting-comments',
    'catalog-comments',
    'station-comments',
    'catalog-tag-settings',
    'catalog-tag-assignments',
    'catalog-favorites',
    'community-events',
    'alert-read-receipts',
    'event-read-receipts',
    'community-surveys',
    'survey-responses',
    'survey-submission-receipts',
    'community-votes',
    'community-vote-nominees',
    'community-vote-ballots',
    'community-vote-ballot-receipts',
    'inaturalist-public-links',
    'community-vote-state',
    'community-vote-nomination-receipts',
    'inaturalist-comment-moderation',
  ]);
  for (const collection of selected.keys())
    if (!supported.has(collection))
      throw new Error(
        `Transformer not implemented for nonempty collection: ${collection}`,
      );
  for (const doc of records('content-contributors')) {
    const d = doc.data;
    const targets =
      d.kind === 'catalog'
        ? records('catalog')
        : d.kind === 'sighting'
          ? records('cat-sightings')
          : [];
    if (!targets.some((target) => target.id === d.contentId))
      throw new Error('Contributor target missing from selected local content');
    provenance(doc, 'app_private.contributors', `${d.kind}/${d.contentId}`);
  }
  // Keep dependency order, but send bounded server-side batches instead of one network round trip per row.
  const transport = sql.slice(0, 3);
  const inserts = sql.slice(3);
  for (let offset = 0; offset < inserts.length; offset += 200) {
    const body = inserts.slice(offset, offset + 200).join('\n');
    let collision = 0;
    let delimiter;
    do {
      delimiter = `$cc_import_batch_${offset}_${collision++}$`;
    } while (body.includes(delimiter));
    transport.push(`do ${delimiter} begin\n${body}\nend ${delimiter};`);
  }
  transport.push('commit;');
  return { sql: transport.join('\n') + '\n', report };
}

function main() {
  const args = argumentsFor(process.argv.slice(2));
  for (const key of ['export', 'manifest', 'output'])
    if (!args[key]) throw new Error(`Missing --${key}`);
  const output = path.resolve(args.output),
    repo = path.resolve(__dirname, '../..');
  if (output === repo || output.startsWith(repo + path.sep))
    throw new Error('Save private import files outside the repository');
  if (fs.existsSync(output) || fs.existsSync(output + '.report.json'))
    throw new Error('Output already exists; use a new filename');
  const result = prepare(
    JSON.parse(fs.readFileSync(args.export, 'utf8')),
    JSON.parse(fs.readFileSync(args.manifest, 'utf8')),
  );
  fs.writeFileSync(output, result.sql, { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(
    output + '.report.json',
    JSON.stringify(result.report, null, 2),
    { mode: 0o600, flag: 'wx' },
  );
  console.log(JSON.stringify(result.report, null, 2));
}
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { decode, literal, upsert, prepare };
