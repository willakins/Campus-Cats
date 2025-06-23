import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/config/firebase';

const User = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.number().int().default(0),
});

type User = z.infer<typeof User>;

const path = 'users';

const fetchUser = async (id: string, email: string) => {
  let userDoc = await getDoc(doc(db, path, id));
  if (!userDoc.exists() && email) {
    await mutateUser({
      id,
      email,
      role: 0,
    });
    userDoc = await getDoc(doc(db, path, id));
  }
  return User.parse({ id: userDoc.id, ...userDoc.data() });
};

const mutateUser = async ({ id, ...data }: User) => {
  await setDoc(doc(db, path, id), data);
};

export { User, fetchUser, mutateUser };
