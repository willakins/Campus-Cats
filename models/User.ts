import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/config/firebase';

const User = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.number().int().default(0),
});

type User = z.infer<typeof User>;

export const path = 'users';

const fetchUser = async (id: string) => {
  const document = await getDoc(doc(db, path, id));
  return User.parse({ id: document.id, ...document.data() });
};

const mutateUser = async ({id, ...data}: User) => {
  await setDoc(doc(db, path, id), data);
};

export { User, fetchUser, mutateUser }
