import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import Keycloak from 'keycloak-js'

console.log('[Bootstrap] Starting Keycloak initialization before React...');

// Create Keycloak instance
const keycloak = new Keycloak({
  url: "https://keycloak.ialla.fr",
  realm: "haas",
  clientId: "react-app",
});

// Export keycloak instance for use in context
export { keycloak };

async function bootstrap() {
  try {
    console.log('[Bootstrap] Current URL:', window.location.href);
    console.log('[Bootstrap] URL params:', window.location.search);
    
    const authenticated = await keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
    });
    
    console.log('[Bootstrap] Keycloak init completed');
    console.log('[Bootstrap] Authenticated:', authenticated);
    console.log('[Bootstrap] Token present:', !!keycloak.token);
    console.log('[Bootstrap] User info:', keycloak.tokenParsed);
    
    // Add event listeners for debugging
    keycloak.onAuthSuccess = () => console.log('[Keycloak] onAuthSuccess triggered');
    keycloak.onAuthError = (e) => console.error('[Keycloak] onAuthError:', e);
    keycloak.onTokenExpired = () => console.log('[Keycloak] onTokenExpired');
    keycloak.onAuthRefreshSuccess = () => console.log('[Keycloak] onAuthRefreshSuccess');
    keycloak.onAuthRefreshError = () => console.log('[Keycloak] onAuthRefreshError');
    
  } catch (error) {
    console.error('[Bootstrap] Keycloak init error:', error);
    console.error('[Bootstrap] Error details:', error?.message || 'Unknown error');
  }

  // Render React app after Keycloak init
  console.log('[Bootstrap] Rendering React app...');
  createRoot(document.getElementById("root")!).render(<App />);
}

bootstrap();