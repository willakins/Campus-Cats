import { auth, db } from '@/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useState, ReactNode, useContext, useEffect } from 'react';

const AuthContext = createContext<{
  signIn: () => void;
  signOut: () => void;
  user: any;
  setUser: any;
  isLoading: boolean;
  setIsLoading: any;
}>({
  signIn: () => null,
  signOut: () => null,
  user: null,
  setUser: null,
  isLoading: true,
  setIsLoading: null,
});

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setIsLoading(true);
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          setUser(userDoc);
          setIsLoading(false);
        } else {
          setUser(null);
        }
      }
    );

    // unsubscribe auth listener on unmount
    return unsubscribe;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      signIn: () => {
      },
      signOut: () => {
      },
      user, setUser,
      isLoading, setIsLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// This hook can be used to access the user info.
const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    console.log('useAuth must be wrapped in an <AuthProvider />');
  }

  return value;
};

export { AuthProvider, useAuth };
