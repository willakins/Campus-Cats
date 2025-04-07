import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as signOutAuthUser, onAuthStateChanged, User as AuthUser } from 'firebase/auth';

import { auth } from '@/config/firebase';
import { User, fetchUser, mutateUser } from '@/models';
import { Router } from 'expo-router';

type AuthContextType = {
  login: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  signOut: (router:Router) => Promise<void>;
  currentUser: AuthUser | null,
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
    alert('hi!')
  };

  const createAccount = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const authUser = userCredential.user;
    // Create a default user
    mutateUser({
      id: authUser.uid,
      email: email,
      role: 0,
    });
  };

  const signOut = async (router:Router) => {
    await signOutAuthUser(auth);
    router.push('/login');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser?.uid) {
          // Get user doc on start
          const data = await fetchUser(authUser?.uid);
          setUser(data);
        }
        setCurrentUser(authUser);
      } catch (error: unknown) {
        console.log(error);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    login, createAccount, signOut,
    currentUser, user, loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// This hook can be used to access the user info.
const useAuth = () => {
  return useContext(AuthContext);
};

export { AuthProvider, useAuth };