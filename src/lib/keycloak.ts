import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: 'https://keycloak.ialla.fr',
  realm: 'haas',
  clientId: 'react-app',
});

// Expose for debugging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).keycloak = keycloak;
