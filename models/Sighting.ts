import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/config/firebase';
import { auth } from '@/config/firebase';
import { firestoreDocRefSchema } from '@/types';
import { path as usersPath } from './User';

const Sighting = z.object({
  id: z.string(),
  user: firestoreDocRefSchema.default( // Use the current user
    doc(db, auth.currentUser ? usersPath + auth.currentUser.uid : '')
  ),
  cat: firestoreDocRefSchema,
  timestamp: z.date(),
  files: z.array(z.string()), // Storage refs
  latitude: z.number(), // TODO: add bounds, since we know the min and max possible
  longitude: z.number(),
  notes: z.string(),
  // TODO: Consider how comments and likes might be represented, along with
  // possible feeding data
});

type Sighting = z.infer<typeof Sighting>;

export const path = 'cat-sightings';

const fetchSighting = async (id: string) => {
  const document = await getDoc(doc(db, path, id));
  return Sighting.parse({ id: document.id, ...document.data() });
};

const mutateSighting = async ({id, ...data}: Sighting) => {
  await setDoc(doc(db, path, id), data);
};

export { Sighting, fetchSighting, mutateSighting }
