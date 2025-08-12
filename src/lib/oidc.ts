import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

const authority = "https://keycloak.ialla.fr/realms/haas";
const client_id = "react-app";

export const userManager = new UserManager({
  authority,
  client_id,
  redirect_uri: `${window.location.origin}/auth/callback`,
  response_type: "code",
  scope: "openid profile email groups",
  loadUserInfo: true,
  // Use sessionStorage for MVP (no persistence across tabs/windows)
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // No silent renew/iframes for now to avoid 3rd-party cookie issues
  automaticSilentRenew: false,
});

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    return await userManager.getUser();
  } catch (e) {
    console.warn("[OIDC] getUser failed: ", e);
    return null;
  }
};

export const loginRedirect = (returnTo?: string) => {
  const state: Record<string, any> = {};
  if (returnTo) state.returnTo = returnTo;
  return userManager.signinRedirect({ state });
};

export const completeLogin = () => userManager.signinCallback();

export const logoutRedirect = () => userManager.signoutRedirect({ post_logout_redirect_uri: `${window.location.origin}/` });
