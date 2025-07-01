import { z } from 'zod';

const Sighting = z.object({
  id: z.string(),
  uid: z.string(),
  name: z.string(),
  spotted_time: z.date(),
  // TODO: make this an array of files eventually
  image: z.string(), // Storage refs
  // TODO: Properly use GeoPoint. May want withConverter to briefly help switch?
  // location: LatLngSchema.nullish(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  info: z.string(),
  fed: z.boolean(),
  health: z.boolean(),
  timeofDay: z.string(),
});

// TODO: Change this pattern, as it may be confusing.
// NOTE: This is an established pattern, where a schema and a type have the same
// name. Since types exist only before compile time, this is fine.
// eslint-disable-next-line @typescript-eslint/no-redeclare
type Sighting = z.infer<typeof Sighting>;

const sightingPath = 'cat-sightings';

export { Sighting, sightingPath };
