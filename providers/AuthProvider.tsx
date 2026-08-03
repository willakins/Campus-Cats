import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { appModules } from '@/composition/appModules';
import { Role, User, parseUser } from '@/core/domain';
import { ExternalSignInResult } from '@/core/ports';

type AuthContextType = {
  login: (email: string, password: string) => Promise<User>;
  createAccount: (email: string, password: string) => Promise<User>;
  samlSignIn: () => Promise<ExternalSignInResult>;
  signOut: () => Promise<void>;
  currentUser: User | undefined;
  user: User;
  loading: boolean;
};

const guest = parseUser({
  id: 'guest',
  email: 'guest@campus-cats.invalid',
  role: Role.Member,
});
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>();
  const [user, setUser] = useState<User>(guest);
  const [loading, setLoading] = useState(true);

  const storeAuthenticatedUser = (authenticated: User) => {
    setCurrentUser(authenticated);
    setUser(authenticated);
    return authenticated;
  };

  const login = async (email: string, password: string) => {
    const result = await appModules.session.signInWithEmail(email, password);
    if (!result.ok) throw new Error(result.error.message);
    return storeAuthenticatedUser(result.value);
  };

  const createAccount = async (email: string, password: string) => {
    const result = await appModules.session.createAccount(email, password);
    if (!result.ok) throw new Error(result.error.message);
    return storeAuthenticatedUser(result.value);
  };

  const samlSignIn = async () => {
    const result = await appModules.session.signInWithSaml();
    if (!result.ok) throw new Error(result.error.message);
    if (result.value.status === 'authenticated') {
      storeAuthenticatedUser(result.value.user);
    }
    return result.value;
  };

  const signOut = async () => {
    const result = await appModules.session.signOut();
    if (!result.ok) throw new Error(result.error.message);
    setCurrentUser(undefined);
    setUser(guest);
  };

  useEffect(() => {
    void appModules.session.restore().then((result) => {
      if (result.ok && result.value) storeAuthenticatedUser(result.value);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        login,
        createAccount,
        samlSignIn,
        signOut,
        currentUser,
        user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };
