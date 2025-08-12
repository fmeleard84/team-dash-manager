import Keycloak from "keycloak-js";

// --- Singleton robuste (évite les doubles instances en dev/HMR) ---
const g = globalThis as any;
const existing = g.__KC__ as Keycloak | undefined;
const instance: Keycloak = existing ?? new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app",
});
if (!existing) g.__KC__ = instance;

export const keycloak = instance;

// --- Gestion simple des jetons (stockés par nous) ---
function getStoredTokens() {
  return {
    at: sessionStorage.getItem("kc_access_token"),
    rt: sessionStorage.getItem("kc_refresh_token"),
  };
}

export async function initKeycloakWithStoredTokens() {
  const { at, rt } = getStoredTokens();

  try {
    if (at && rt) {
      await keycloak.init({
        pkceMethod: "S256",
        checkLoginIframe: false,
        token: at,
        refreshToken: rt,
      });
    } else {
      await keycloak.init({
        pkceMethod: "S256",
        checkLoginIframe: false,
      });
    }
  } catch {
    // Dernier recours : repartir “propre”
    await keycloak.init({ pkceMethod: "S256", checkLoginIframe: false });
  }
}

export function storeTokensFromKC() {
  if (keycloak.token) sessionStorage.setItem("kc_access_token", keycloak.token);
  if (keycloak.refreshToken) sessionStorage.setItem("kc_refresh_token", keycloak.refreshToken);
}

export function clearStoredTokens() {
  sessionStorage.removeItem("kc_access_token");
  sessionStorage.removeItem("kc_refresh_token");
}
