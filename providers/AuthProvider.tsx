import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { appModules } from '@/composition/appModules';
import { Role, User, parseUser } from '@/core/domain';
import { ExternalSignInResult } from '@/core/ports';
import { LEGAL_TERMS_VERSION } from '@/legal/policies';

type AuthContextType = {
  login: (email: string, password: string) => Promise<User>;
  createAccount: (email: string, password: string) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<void>;
  samlSignIn: () => Promise<ExternalSignInResult>;
  signOut: () => Promise<void>;
  acceptTerms: () => Promise<void>;
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
  const syncedProfileIds = useRef(new Set<string>());

  const storeAuthenticatedUser = (authenticated: User) => {
    setCurrentUser(authenticated);
    setUser(authenticated);
    if (!syncedProfileIds.current.has(authenticated.id)) {
      syncedProfileIds.current.add(authenticated.id);
      void appModules.profiles?.sync(authenticated);
    }
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

  const requestPasswordReset = async (email: string) => {
    const result = await appModules.session.requestPasswordReset(email);
    if (!result.ok) throw new Error(result.error.message);
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

  const acceptTerms = async () => {
    const result = await appModules.session.acceptTerms(LEGAL_TERMS_VERSION);
    if (!result.ok) throw new Error(result.error.message);
  };

  useEffect(() => {
    let receivedLiveProfile = false;
    let mounted = true;
    const unsubscribe = appModules.session.observeCurrentUser((profile) => {
      if (!mounted) return;
      receivedLiveProfile = true;
      if (profile) storeAuthenticatedUser(profile);
      else {
        setCurrentUser(undefined);
        setUser(guest);
      }
      setLoading(false);
    });
    void appModules.session.restore().then((result) => {
      if (!mounted || receivedLiveProfile) return;
      if (result.ok && result.value) storeAuthenticatedUser(result.value);
      setLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        login,
        createAccount,
        requestPasswordReset,
        samlSignIn,
        signOut,
        acceptTerms,
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
