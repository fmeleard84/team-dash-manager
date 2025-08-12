import Keycloak, { KeycloakInitOptions } from "keycloak-js";

declare global {
  // évite de recréer l'instance en dev/HMR
  var __KC__: ReturnType<typeof Keycloak> | undefined;
}

export const keycloak = globalThis.__KC__ ?? (globalThis.__KC__ = new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app",
}));

export async function initKeycloakPassive() {
  // init "neutre": ne traite PAS le code, ne lance PAS d’iframe
  const opts: KeycloakInitOptions = {
    pkceMethod: "S256",
    checkLoginIframe: false,
  };
  try {
    await keycloak.init(opts);
  } catch (e) {
    // on ignore: c’est passif
    console.warn("[KC] passive init error (ignored)", e);
  }
}
