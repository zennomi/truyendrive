import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchAccount,
  getAuthUser,
  type DriveAccountData,
} from '../lib/driveApi';

type AuthContextValue = {
  accountData: DriveAccountData | null;
  error: Error | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_POLL_MS = 500;
const accountCache = new Map<string, DriveAccountData>();
const pendingAccountRequests = new Map<string, Promise<DriveAccountData>>();

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error('Failed to load account');
}

function loadAccount(authUser: string) {
  const cachedAccountData = accountCache.get(authUser);
  if (cachedAccountData) {
    return Promise.resolve(cachedAccountData);
  }

  const pendingRequest = pendingAccountRequests.get(authUser);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetchAccount(authUser)
    .then((accountData) => {
      accountCache.set(authUser, accountData);
      pendingAccountRequests.delete(authUser);
      return accountData;
    })
    .catch((error) => {
      pendingAccountRequests.delete(authUser);
      throw error;
    });

  pendingAccountRequests.set(authUser, request);
  return request;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accountData, setAccountData] = useState<DriveAccountData | null>(null);
  const [authUser, setAuthUser] = useState(() => getAuthUser());
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncAuthUser = () => {
      const nextAuthUser = getAuthUser();
      setAuthUser((currentAuthUser) =>
        currentAuthUser === nextAuthUser ? currentAuthUser : nextAuthUser,
      );
    };

    syncAuthUser();

    const intervalId = window.setInterval(syncAuthUser, AUTH_USER_POLL_MS);
    window.addEventListener('hashchange', syncAuthUser);
    window.addEventListener('popstate', syncAuthUser);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('hashchange', syncAuthUser);
      window.removeEventListener('popstate', syncAuthUser);
    };
  }, []);

  useEffect(() => {
    const cachedAccountData = accountCache.get(authUser);
    if (cachedAccountData) {
      setAccountData(cachedAccountData);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    setAccountData(null);
    setError(null);
    setIsLoading(true);

    loadAccount(authUser)
      .then((nextAccountData) => {
        if (isCancelled) {
          return;
        }

        setAccountData(nextAccountData);
        setIsLoading(false);
      })
      .catch((nextError) => {
        if (isCancelled) {
          return;
        }

        setAccountData(null);
        setError(normalizeError(nextError));
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [authUser]);

  const value = useMemo(
    () => ({
      accountData,
      error,
      isLoading,
    }),
    [accountData, error, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
