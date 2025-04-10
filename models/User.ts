import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/config/firebase';

import { User as UserClass, UserProps } from '@/types'; // Assuming your User class is in types/user.ts

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.number().int().default(0),
});

const path = 'users';

/**
 * Fetches a user from Firestore. Creates a default one if not found (and email is provided).
 * Returns a User class instance.
 */
const fetchUser = async (id: string, email?: string): Promise<UserClass> => {
  const userRef = doc(db, path, id);
  let userDoc = await getDoc(userRef);

  // Create default user if not found and email exists
  if (!userDoc.exists() && email) {
    await mutateUser({
      id,
      email,
      role: 0,
    });
    userDoc = await getDoc(userRef); // refetch
  }

  if (!userDoc.exists()) {
    throw new Error(`User with id "${id}" not found and could not be created.`);
  }

  const result = UserSchema.safeParse({ id: userDoc.id, ...userDoc.data() });

  if (!result.success) {
    throw new Error(`Invalid user data: ${JSON.stringify(result.error.format())}`);
  }

  return new UserClass(result.data);
};

/**
 * Creates or updates a user document in Firestore.
 * Accepts either a UserProps object or a User instance.
 */
const mutateUser = async (user: UserProps | UserClass): Promise<void> => {
  const { id, ...data } = user;
  await setDoc(doc(db, path, id), data, { merge: true });
};

export { fetchUser, mutateUser };
