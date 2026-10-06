import {
  ApplicationCodecs,
  Outcome,
  SightingRecord,
  failure,
  importedSightingRecord,
  localSightingRecord,
  success,
} from '../../core/domain';
import { SightingMapQuery, SightingMapReader } from '../../core/ports';

export interface SightingMapPage {
  readonly sightings: readonly SightingRecord[];
  readonly nextCursor?: string;
}
export class SightingMapModule {
  constructor(
    private readonly reader: SightingMapReader | undefined,
    private readonly codecs: ApplicationCodecs,
  ) {}

  async page(query: SightingMapQuery): Promise<Outcome<SightingMapPage>> {
    if (!this.reader)
      return failure('dependency_failure', 'Map queries are unavailable');
    try {
      const page = await this.reader.page(query);
      const sightings: SightingRecord[] = [];
      let skipped = 0;
      for (const [source, documents] of [
        ['local', page.local],
        ['imported', page.imported],
      ] as const) {
        for (const { id, data } of documents) {
          try {
            const record =
              source === 'local'
                ? localSightingRecord(this.codecs.sighting.decode(id, data))
                : importedSightingRecord(
                    this.codecs.inaturalistObservation.decode(id, data),
                  );
            // Map pins never need contributor identity, including legacy records.
            if (record.source === 'campus-cats') {
              const { createdBy: _contributor, ...anonymous } = record;
              sightings.push(anonymous);
            } else if (record.visible && record.location)
              sightings.push(record);
          } catch {
            skipped += 1;
          }
        }
      }
      return success(
        { sightings, nextCursor: page.nextCursor },
        skipped
          ? [
              {
                code: 'partial_completion',
                message: `${skipped} invalid map records were skipped`,
              },
            ]
          : [],
      );
    } catch {
      return failure(
        'dependency_failure',
        'Could not load sightings in this map area. Please retry.',
      );
    }
  }
}
