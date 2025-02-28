import { auth, db } from '@/services/firebase';
import { onAuthStateChanged, User as AuthUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useState, ReactNode, useContext, useEffect } from 'react';

// TODO: implement User type
type User = any;

type AuthContextType = {
  login: (username: string, password: string) => Promise<UserCredential>;
  createAccount: (username: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  currentUser: AuthUser | null,
  user: User;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const login = async (username: string, password: string): Promise<UserCredential> => {
    const userCredential = await signInWithEmailAndPassword(auth, username, password);
    const authUser = userCredential.user;
    const userDoc = await getDoc(doc(db, 'users', authUser.uid));
    if (userDoc.exists()) {
      setUser({ id: userDoc.id, ...userDoc.data() });
    } else {
      setUser(null);
    }
    return userCredential;
  };

  const createAccount = async (username: string, password: string): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, username, password);
    const authUser = userCredential.user;
    const userDoc = await getDoc(doc(db, 'users', authUser.uid));
    if (userDoc.exists()) {
      setUser({ id: userDoc.id, ...userDoc.data() });
    } else {
      setUser(null);
    }
    return userCredential;
  };

  const signOut = async (): Promise<void> => {
    await auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setCurrentUser(authUser);
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
