import Keycloak, { KeycloakInitOptions } from "keycloak-js";

export const keycloak = new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app",
});

export async function initKeycloak() {
  const hasCode = new URLSearchParams(window.location.search).has("code");
  const baseOpts: KeycloakInitOptions = {
    onLoad: "check-sso",     // best-effort, non bloquant
    pkceMethod: "S256",
    checkLoginIframe: false, // pas d'iframe de session
    // IMPORTANT: pas de silentCheckSsoRedirectUri -> évite l’iframe 3rd-party
  };

  try {
    const ok = await keycloak.init(baseOpts);
    return ok;
  } catch (e) {
    console.warn("[Keycloak] init failed, retrying:", e);
    if (hasCode) {
      const ok2 = await keycloak.init({
        onLoad: "login-required",
        pkceMethod: "S256",
        checkLoginIframe: false,
      });
      return ok2;
    }
    return false;
  }
}
