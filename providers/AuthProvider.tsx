import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Router } from 'expo-router';
import {
  User as AuthUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as signOutAuthUser,
} from 'firebase/auth';

import { auth } from '@/config/firebase';
import { User, fetchUser, mutateUser } from '@/models';

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
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const authUser = userCredential.user;
    // Create a default user
    await mutateUser({
      id: authUser.uid,
      email: email,
      role: 0,
    });
  };

  const signOut = async (router: Router) => {
    await signOutAuthUser(auth);
    router.push('/login');
  };

  useEffect(() => {
    const handleAuthStateChange = async (authUser: AuthUser | null) => {
      try {
        if (authUser?.uid && authUser?.email) {
          // Get user doc on start
          const data = await fetchUser(authUser?.uid, authUser?.email);
          setUser(data);
        }
        setCurrentUser(authUser);
      } catch (error: unknown) {
        console.log(error);
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      void handleAuthStateChange(authUser);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// This hook can be used to access the user info.
const useAuth = () => {
  return useContext(AuthContext);
};

export { AuthProvider, useAuth };
