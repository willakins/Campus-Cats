import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as signOutAuthUser,
  onAuthStateChanged,
  User as AuthUser
} from 'firebase/auth';

import { auth } from '@/config/firebase';
import { fetchUser, mutateUser } from '@/models';
import { Router } from 'expo-router';
import { User } from '@/types';

type AuthContextType = {
  login: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  signOut: (router: Router) => Promise<void>;
  currentUser: AuthUser | null;
  user: User;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User>({} as User);
  const [loading, setLoading] = useState<boolean>(true);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const createAccount = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const authUser = userCredential.user;
    await mutateUser({
      id: authUser.uid,
      email,
      role: 0, // default role
    });
  };

  const signOut = async (router: Router) => {
    await signOutAuthUser(auth);
    router.push('/login');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      try {
        if (authUser?.uid) {
          const email = authUser.email ?? '';
          const userData = await fetchUser(authUser.uid, email);
          
          // fallback in case user doc doesn't exist
          if (!userData || !userData.role) {
            console.warn('No user role found. Check if the user document exists in Firestore.');
          }

          setUser(userData);
        } else {
          setUser({} as User);
        }
        setCurrentUser(authUser);
      } catch (error) {
        console.error('Error during auth state change:', error);
        setUser({} as User);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    login,
    createAccount,
    signOut,
    currentUser,
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };