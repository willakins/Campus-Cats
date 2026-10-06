import { createPersistenceCodecs, parseSighting } from '../../core/domain';
import { SightingMapModule } from './SightingMapModule';
const codecs = createPersistenceCodecs({ encode: (date: Date) => date, decode: (value: unknown) => {
  if (!(value instanceof Date)) throw new Error('Invalid date');
  return value;
} });
const query = { bounds: { south: 33, north: 34, west: -85, east: -84 } };
it('removes legacy contributor identity and keeps pagination when invalid imports are skipped', async () => {
  const report = parseSighting({ id: 'local-one', name: 'Goldie', info: '', fed: true, health: true,
    date: new Date(), location: { latitude: 33.7, longitude: -84.4 }, timeOfDay: 'Afternoon',
    createdBy: { id: 'member-one', email: 'private@example.invalid', role: 0 },
  });
  const page = jest.fn().mockResolvedValue({ local: [{ id: report.id, data: { ...codecs.sighting.encode(report), createdBy: report.createdBy } }],
    imported: [{ id: 'bad', data: {} }], nextCursor: 'more' });
  const result = await new SightingMapModule({ page }, codecs).page(query);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error('Expected success');
  expect(result.value.nextCursor).toBe('more');
  expect(result.value.sightings).toHaveLength(1);
  expect(result.value.sightings[0]).not.toHaveProperty('createdBy');
  expect(result.warnings).toHaveLength(1);
  expect(page).toHaveBeenCalledWith(query);
});
it('reports failure without falling back to unbounded list reads', async () => {
  const result = await new SightingMapModule(undefined, codecs).page(query);
  expect(result).toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
});
