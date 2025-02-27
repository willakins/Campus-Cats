import { auth, db } from '@/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useState, ReactNode, useContext, useEffect } from 'react';

type AuthContextType = {
  login: () => void;
  createAccount: () => void;
  signOut: () => void;
  currentUser: User | null,
  userData: any;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const login = () => {
    // TODO: Actually use this to sign in
  };
  const createAccount = () => {
    // TODO: Actually use this to signup
  };
  const signOut = () => {
    auth.signOut();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setCurrentUser(authUser);

      // Keep track of the user data in Firestore
      if (authUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() });
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    login, createAccount, signOut,
    currentUser, userData, loading,
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
