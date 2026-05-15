import { useEffect, useMemo, useState } from 'react';

import {
  fetchAccount,
  getAuthUser as getGoogleDriveAuthUser,
  isAuthenticated,
  type DriveAccountData,
} from '../../lib/driveApi';

const AUTH_USER_POLL_MS = 500;
const accountCache = new Map<string, DriveAccountData>();
const pendingAccountRequests = new Map<string, Promise<DriveAccountData>>();

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error('Failed to load account');
}

export { isAuthenticated } from '../../lib/driveApi';

/** Returns 'guest' when no SAPISID cookie is present, otherwise the Drive auth-user index. */
export function getEffectiveAuthUser() {
  return isAuthenticated() ? getGoogleDriveAuthUser() : 'guest';
}

export function getAuthUser() {
  return getEffectiveAuthUser();
}

export function loadAccount(
  authUser = getAuthUser(),
): Promise<DriveAccountData | null> {
  if (!isAuthenticated()) {
    return Promise.resolve(null);
  }

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

export function useGoogleDriveAuth() {
  const [accountData, setAccountData] = useState<DriveAccountData | null>(null);
  const [authUser, setAuthUser] = useState(() => getAuthUser());
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(() => isAuthenticated());

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
    let isCancelled = false;
    const shouldLoadAccount = isAuthenticated();

    setAccountData(null);
    setError(null);
    setIsLoading(shouldLoadAccount);

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

  return useMemo(
    () => ({
      accountData,
      error,
      isLoading,
    }),
    [accountData, error, isLoading],
  );
}
