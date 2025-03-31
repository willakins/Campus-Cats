import { z } from 'zod';

import { firestoreDocRefSchema } from '@/types';

const Sighting = z.object({
  user: firestoreDocRefSchema.nullish(),
  name: z.string().nullish(),
  timestamp: z.date().nullish(),
  files: z.array(z.string()).default([]), // Storage refs
  // TODO: Properly use GeoPoint. May want withConverter to briefly help switch?
  // location: LatLngSchema.nullish(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  info: z.string().nullish(),
});

type Sighting = z.infer<typeof Sighting>;

const sightingPath = 'cat-sightings';

export { Sighting, sightingPath };
