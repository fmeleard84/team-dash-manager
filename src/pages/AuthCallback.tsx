// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import Keycloak from "keycloak-js";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      try {
        // ⚠️ instance TEMPORAIRE (pas le singleton)
        const tmp = new Keycloak({
          url: "https://keycloak.ialla.fr",
          realm: "haas",
          clientId: "react-app",
        });

        const ok = await tmp.init({
          onLoad: "login-required", // finalise le code flow ICI
          pkceMethod: "S256",
          checkLoginIframe: false,
        });

        if (!ok) {
          await tmp.login({
            redirectUri: window.location.href,
            scope: "openid profile email groups",
          });
          return;
        }

        // Stocke les jetons pour les autres pages
        if (tmp.token) sessionStorage.setItem("kc_access_token", tmp.token);
        if (tmp.refreshToken) sessionStorage.setItem("kc_refresh_token", tmp.refreshToken);

        // Choisir la cible
        const url = new URL(window.location.href);
        let target = url.searchParams.get("to") || "/";
        if (!url.searchParams.get("to")) {
          const groups = (tmp.tokenParsed?.groups ?? []) as string[];
          target =
            groups?.includes?.("/client") ? "/client-dashboard" :
            groups?.some?.((g: string) => ["/resource", "/ressource", "/candidate"].includes(g)) ? "/candidate-dashboard" :
            "/client-dashboard";
        }

        // Redirige (nouvelle page) -> main.tsx fera l'init passif avec les jetons
        window.location.replace(target);
      } catch (e) {
        console.error("[AuthCallback] error", e);
        // Re-demande un login sur cette même page de callback
        const fallback = `${window.location.origin}/auth/callback`;
        window.location.assign(fallback);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Connexion en cours…</p>
    </main>
  );
}
