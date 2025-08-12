import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { keycloak } from './lib/keycloak'

console.log('[Bootstrap] Starting React app...');

async function bootstrap() {
  try {
    console.log('[Bootstrap] Initializing Keycloak before React...');
    const hasCode = new URLSearchParams(window.location.search).has('code');
    try {
      const ok = await keycloak.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      });
      console.log('[Bootstrap] Keycloak initialized:', { authenticated: !!keycloak.authenticated, ok });
    } catch (e) {
      console.warn('[Bootstrap] Keycloak init failed, retrying if OIDC code present:', e);
      if (hasCode) {
        try {
          const ok2 = await keycloak.init({
            onLoad: 'login-required',
            pkceMethod: 'S256',
            checkLoginIframe: false,
          });
          console.log('[Bootstrap] Retry Keycloak init:', { authenticated: !!keycloak.authenticated, ok: ok2 });
        } catch (e2) {
          console.error('[Bootstrap] Keycloak retry failed:', e2);
        }
      }
    }
  } finally {
    createRoot(document.getElementById('root')!).render(<App />);
  }
} 

bootstrap();
