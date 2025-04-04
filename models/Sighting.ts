import { z } from 'zod';

import { firestoreDocRefSchema } from '@/types';

const Sighting = z.object({
  id: z.string().nullable().default(null),
  user: firestoreDocRefSchema.nullish(),
  name: z.string().nullish(),
  spotted_time: z.date().nullish(),
  // TODO: make this an array of files eventually
  image: z.string().nullish(), // Storage refs
  // TODO: Properly use GeoPoint. May want withConverter to briefly help switch?
  // location: LatLngSchema.nullish(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  info: z.string().nullish(),
  fed: z.boolean(),
  health: z.boolean(),
});

type Sighting = z.infer<typeof Sighting>;

const sightingPath = 'cat-sightings';

export { Sighting, sightingPath };
