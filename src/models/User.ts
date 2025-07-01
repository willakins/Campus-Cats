import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/config/firebase';

const User = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.number().int().default(0),
});

// TODO: Change this pattern, as it may be confusing.
// NOTE: This is an established pattern, where a schema and a type have the same
// name. Since types exist only before compile time, this is fine.
// eslint-disable-next-line @typescript-eslint/no-redeclare
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
