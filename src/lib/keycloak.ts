import Keycloak, { KeycloakInitOptions } from "keycloak-js";

export const keycloak = new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app",   // public + PKCE
});

export async function initKeycloak() {
  const hasAuthParams = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.has("code") || p.has("session_state") || p.has("state");
  })();

  const base: KeycloakInitOptions = {
    pkceMethod: "S256",
    checkLoginIframe: false,   // pas d’iframe de session (source d’ennuis)
    // pas de silentCheckSsoRedirectUri, pas de onLoad:"check-sso"
  };

  // Si on revient de Keycloak avec ?code=..., force l’achèvement du login
  return hasAuthParams
    ? keycloak.init({ ...base, onLoad: "login-required" })
    : keycloak.init(base);
}
