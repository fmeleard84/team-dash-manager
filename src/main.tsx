import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { keycloak } from './lib/keycloak'

console.log('[Bootstrap] Starting React app...');

async function bootstrap() {
  try {
    console.log('[Bootstrap] Initializing Keycloak before React...');
    await keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    });
    console.log('[Bootstrap] Keycloak initialized:', { authenticated: !!keycloak.authenticated });
  } catch (e) {
    console.error('[Bootstrap] Keycloak init failed (continuing):', e);
  } finally {
    createRoot(document.getElementById('root')!).render(<App />);
  }
}

bootstrap();
