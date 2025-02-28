import { auth, db } from '@/services/firebase';
import { onAuthStateChanged, User as AuthUser, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useState, ReactNode, useContext, useEffect } from 'react';

// TODO: implement User type
type User = any;

type AuthContextType = {
  login: (username: string, password: string) => void;
  createAccount: (username: string, password: string) => void;
  signOut: () => void;
  currentUser: AuthUser | null,
  user: User;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const login = (username: string, password: string) => {
    signInWithEmailAndPassword(auth, username, password)
      .then((userCredential) => {
        const authUser = userCredential.user
        return getDoc(doc(db, 'users', authUser.uid));
      })
      .then((userDoc) => {
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        throw Error('Failed to log in');
      });
  };

  const createAccount = (username: string, password: string) => {
    createUserWithEmailAndPassword(auth, username, password)
      .then((userCredential) => {
        const authUser = userCredential.user
        return getDoc(doc(db, 'users', authUser.uid));
      })
      .then((userDoc) => {
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        throw Error('Failed to log in');
      });
  };

  const signOut = () => {
    auth.signOut().then(() => setUser(null));
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
