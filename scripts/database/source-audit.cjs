#!/usr/bin/env node
'use strict';
// Offline, aggregate-only comparison of legacy and tenant imports.
const fs = require('node:fs');
const { argumentsFor } = require('./export-firestore.cjs');
const { decode } = require('./prepare-import.cjs');

const fields = (input) =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, decode(value)]),
  );
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );

function audit(snapshot) {
  const result = {
    sourceProject: snapshot.project,
    sourceClub: snapshot.club,
    exportCompletedAt: snapshot.completedAt,
    sourceConsistent: snapshot.consistentSnapshot,
    duplicateCollections: {},
  };
  for (const collection of [
    'inaturalist-observations',
    'inaturalist-guide-profiles',
  ]) {
    const roots = new Map(
      snapshot.documents
        .filter((doc) => doc.path.startsWith(collection + '/'))
        .map((doc) => [doc.path.split('/').at(-1), fields(doc.fields)]),
    );
    const tenants = new Map(
      snapshot.documents
        .filter((doc) =>
          doc.path.startsWith(`clubs/${snapshot.club}/${collection}/`),
        )
        .map((doc) => [doc.path.split('/').at(-1), fields(doc.fields)]),
    );
    const changedFields = {};
    let identical = 0,
      missingInTenant = 0;
    for (const [id, root] of roots) {
      const tenant = tenants.get(id);
      if (!tenant) {
        missingInTenant++;
        continue;
      }
      if (canonical(root) === canonical(tenant)) identical++;
      for (const key of new Set([
        ...Object.keys(root),
        ...Object.keys(tenant),
      ])) {
        if (canonical(root[key]) !== canonical(tenant[key]))
          changedFields[key] = (changedFields[key] || 0) + 1;
      }
    }
    const summary = {
      rootRecords: roots.size,
      tenantRecords: tenants.size,
      identicalRecords: identical,
      rootOnlyRecords: missingInTenant,
      tenantOnlyRecords: [...tenants.keys()].filter((id) => !roots.has(id))
        .length,
      changedFields,
    };
    if (collection === 'inaturalist-guide-profiles') {
      const localIds = new Set(
        snapshot.documents
          .filter((doc) => doc.path.startsWith('catalog/'))
          .map((doc) => doc.path.split('/').at(-1)),
      );
      const links = [...roots.entries()].filter(
        ([, root]) => root.linkedLocalCatalogId,
      );
      summary.relationshipAudit = {
        rootExplicitLinks: links.length,
        missingLocalTargets: links.filter(
          ([, root]) => !localIds.has(root.linkedLocalCatalogId),
        ).length,
        notLinkedStatus: links.filter(
          ([, root]) => root.matchStatus !== 'linked',
        ).length,
        conflictingTenantLinks: links.filter(
          ([id, root]) =>
            tenants.get(id)?.linkedLocalCatalogId &&
            tenants.get(id).linkedLocalCatalogId !== root.linkedLocalCatalogId,
        ).length,
        distinctLocalTargets: new Set(
          links.map(([, root]) => root.linkedLocalCatalogId),
        ).size,
      };
    }
    result.duplicateCollections[collection] = summary;
  }
  return result;
}
function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (!args.export || !args.output)
    throw new Error('Use --export and --output');
  const result = audit(JSON.parse(fs.readFileSync(args.export, 'utf8')));
  fs.writeFileSync(args.output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { audit };
