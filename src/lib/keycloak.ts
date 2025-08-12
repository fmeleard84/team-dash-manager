import Keycloak, { KeycloakInitOptions } from "keycloak-js";

export const keycloak = new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app", // client public + PKCE
});

export async function initKeycloak() {
  // important : init neutre, pas de check-sso qui déclenche 3p-cookies
  const opts: KeycloakInitOptions = {
    flow: "standard",          // code flow
    pkceMethod: "S256",
    checkLoginIframe: false,   // pas d’iframe de session
    // PAS de silentCheckSsoRedirectUri
    // PAS de onLoad:"check-sso"
  };
  const ok = await keycloak.init(opts);
  return ok; // true si une session existe déjà SUR CE domaine (rare), sinon false
}
