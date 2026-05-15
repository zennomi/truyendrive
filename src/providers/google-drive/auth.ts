import {
  fetchAccount,
  getAuthUser as getGoogleDriveAuthUser,
  isAuthenticated,
  type DriveAccountData,
} from '../../lib/driveApi';

const accountCache = new Map<string, DriveAccountData>();
const pendingAccountRequests = new Map<string, Promise<DriveAccountData>>();

export { isAuthenticated } from '../../lib/driveApi';

/** Returns 'guest' when no SAPISID cookie is present, otherwise the Drive auth-user index. */
export function getAuthUser() {
  return isAuthenticated() ? getGoogleDriveAuthUser() : 'guest';
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
