import {
  InaturalistHttpGateway,
  mapGuideTaxon,
  mapObservation,
  normalizeCatName,
} from './inaturalist';

async function checkCurrentEndpoints(): Promise<void> {
  const gateway = new InaturalistHttpGateway();
  const checkedAt = new Date();
  const guidePayloads = await gateway.listGuideTaxa();
  const guideProfiles = guidePayloads.map((payload) =>
    mapGuideTaxon(payload, checkedAt, 'read-only-contract-check'),
  );
  if (guideProfiles.length === 0) {
    throw new Error('The Georgia Tech Cats guide returned no profiles');
  }

  const guideByName = new Map(
    guideProfiles.map(({ id, displayName }) => [
      normalizeCatName(displayName),
      id,
    ]),
  );
  const observationPage = await gateway.listObservations();
  const observations = observationPage.results.map((payload) =>
    mapObservation(
      payload,
      guideByName,
      checkedAt,
      'read-only-contract-check',
    ),
  );
  if (observations.length === 0) {
    throw new Error('The Georgia Tech Cat Sightings project returned no observations');
  }

  console.log(
    `Validated ${guideProfiles.length} guide profiles and ${observations.length} observations from the first v2 page.`,
  );
  console.log('This command performed read-only unauthenticated GET requests.');
}

void checkCurrentEndpoints().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
