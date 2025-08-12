import Keycloak, { KeycloakInitOptions } from "keycloak-js";

declare global {
  var __KC__: ReturnType<typeof Keycloak> | undefined;
}

export const keycloak = globalThis.__KC__ ?? (globalThis.__KC__ = new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app",
}));

function getStoredTokens() {
  const at = sessionStorage.getItem("kc_access_token");
  const rt = sessionStorage.getItem("kc_refresh_token");
  return { at, rt };
}

export async function initKeycloakWithStoredTokens() {
  const { at, rt } = getStoredTokens();
  const opts: KeycloakInitOptions = {
    pkceMethod: "S256",
    checkLoginIframe: false,
  };
  try {
    if (at && rt) {
      // injecte les jetons que NOUS avons stockés
      await keycloak.init({ ...opts, token: at, refreshToken: rt });
    } else {
      await keycloak.init(opts);
    }
  } catch {
    // en dernier recours, démarre sans (l’app forcera un login si nécessaire)
    await keycloak.init({ pkceMethod: "S256", checkLoginIframe: false }
