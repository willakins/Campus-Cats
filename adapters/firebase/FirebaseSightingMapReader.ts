import {
  Firestore,
  QueryConstraint,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { z } from 'zod';
import { SightingMapQuery, SightingMapReader } from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';

const PAGE_SIZE = 100;
const positionSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  seconds: z.number().int(),
  nanoseconds: z.number().int().min(0).max(999999999),
  id: z.string().min(1),
});
const cursorSchema = z.object({
  scope: z.string(),
  positions: z.array(positionSchema.nullable()),
  done: z.array(z.boolean()),
});

/** Bounded, indexed reads; one independent cursor per source/longitude interval. */
export class FirebaseSightingMapReader implements SightingMapReader {
  constructor(
    private readonly db: Firestore,
    private readonly tenant: FirebaseTenantScope,
    private readonly userId: () => string,
  ) {}

  async page(request: SightingMapQuery) {
    const { bounds, since } = request;
    z.object({
      south: z.number().min(-90).max(90),
      north: z.number().min(-90).max(90),
      west: z.number().min(-180).max(180),
      east: z.number().min(-180).max(180),
    })
      .refine((value) => value.south <= value.north)
      .parse(bounds);
    if (since && Number.isNaN(since.getTime()))
      throw new Error('Invalid map date');
    const club = this.tenant.clubId;
    const uid = this.userId();
    if (!uid) throw new Error('Sign in to view sightings');
    const scope = JSON.stringify([uid, club, bounds, since?.toISOString()]);
    const intervals =
      bounds.west > bounds.east
        ? [
            [bounds.west, 180],
            [-180, bounds.east],
          ]
        : [[bounds.west, bounds.east]];
    const streams = ['cat-sightings', 'inaturalist-observations'].flatMap(
      (name) => intervals.map(([west, east]) => ({ name, west, east })),
    );
    const previous = request.cursor
      ? cursorSchema.parse(JSON.parse(request.cursor))
      : undefined;
    if (
      previous &&
      (previous.scope !== scope ||
        previous.positions.length !== streams.length ||
        previous.done.length !== streams.length)
    )
      throw new Error('Map cursor belongs to another query');
    const pages = await Promise.all(
      streams.map(async ({ name, west, east }, index) => {
        if (previous?.done[index])
          return {
            documents: [],
            done: true,
            position: previous.positions[index],
          };
        const imported = name === 'inaturalist-observations';
        const dateField = imported ? 'observedAt' : 'spotted_time';
        const filters: QueryConstraint[] = [
          ...(imported ? [where('visible', '==', true)] : []),
          where('location.latitude', '>=', bounds.south),
          where('location.latitude', '<=', bounds.north),
          where('location.longitude', '>=', west),
          where('location.longitude', '<=', east),
          ...(since ? [where(dateField, '>=', Timestamp.fromDate(since))] : []),
          orderBy('location.latitude'),
          orderBy('location.longitude'),
          orderBy(dateField, 'desc'),
          orderBy(documentId()),
        ];
        const position = previous?.positions[index];
        if (position)
          filters.push(
            startAfter(
              position.latitude,
              position.longitude,
              new Timestamp(position.seconds, position.nanoseconds),
              position.id,
            ),
          );
        filters.push(limit(PAGE_SIZE + 1));
        const snapshot = await getDocs(
          query(collection(this.db, `clubs/${club}/${name}`), ...filters),
        );
        const documents = snapshot.docs.slice(0, PAGE_SIZE);
        const last: QueryDocumentSnapshot | undefined = documents.at(-1);
        const lastDate: Timestamp | undefined = last?.get(dateField);
        return {
          documents: documents.map((doc) => ({ id: doc.id, data: doc.data() })),
          done: snapshot.docs.length <= PAGE_SIZE,
          position:
            last && lastDate
              ? {
                  latitude: last.get('location.latitude') as number,
                  longitude: last.get('location.longitude') as number,
                  seconds: lastDate.seconds,
                  nanoseconds: lastDate.nanoseconds,
                  id: last.id,
                }
              : (position ?? null),
        };
      }),
    );
    // Never deliver an old account/club response after an identity switch.
    if (uid !== this.userId() || club !== this.tenant.clubId)
      throw new Error('Map session changed');
    return {
      local: pages.slice(0, intervals.length).flatMap((page) => page.documents),
      imported: pages.slice(intervals.length).flatMap((page) => page.documents),
      nextCursor: pages.some((page) => !page.done)
        ? JSON.stringify({
            scope,
            positions: pages.map((page) => page.position),
            done: pages.map((page) => page.done),
          })
        : undefined,
    };
  }
}
