import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { DriveProvider } from '../providers/types';

type ProviderContextValue = {
  error: Error | null;
  isLoading: boolean;
  isReady: boolean;
  provider: DriveProvider;
};

const ProviderContext = createContext<ProviderContextValue | undefined>(
  undefined,
);

const AUTH_USER_POLL_MS = 500;

export function ProviderProvider({
  children,
  provider,
}: {
  children: ReactNode;
  provider: DriveProvider;
}) {
  const [authUser, setAuthUser] = useState(() => provider.getAuthUser());
  const [error, setError] = useState<Error | null>(() =>
    provider.getInitError(),
  );
  const [isLoading, setIsLoading] = useState(() => !provider.isReady());
  const [isReady, setIsReady] = useState(() => provider.isReady());

  useEffect(() => {
    const syncAuthUser = () => {
      const nextAuthUser = provider.getAuthUser();
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
  }, [provider]);

  useEffect(() => {
    let isCancelled = false;
    const isReadyBeforeInit = provider.isReady();

    setError(null);
    setIsLoading(!isReadyBeforeInit);
    setIsReady(isReadyBeforeInit);

    provider
      .initialize()
      .catch(() => undefined)
      .then(() => {
        if (isCancelled) {
          return;
        }

        setError(provider.getInitError());
        setIsReady(provider.isReady());
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [authUser, provider]);

  const value = useMemo(
    () => ({
      error,
      isLoading,
      isReady,
      provider,
    }),
    [error, isLoading, isReady, provider],
  );

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProvider must be used within a ProviderProvider');
  }

  return context.provider;
}

export function useProviderStatus() {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProviderStatus must be used within a ProviderProvider');
  }

  return {
    error: context.error,
    isLoading: context.isLoading,
    isReady: context.isReady,
  };
}
