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

type Sighting = z.infer<typeof Sighting>;

const sightingPath = 'cat-sightings';

export { Sighting, sightingPath };
