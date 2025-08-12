import { useEffect } from "react";
import Keycloak from "keycloak-js";

const LOCK = "kc_cb_lock_v1";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      // Empêche toute re-entrée (StrictMode ou re-montage)
      if (sessionStorage.getItem(LOCK)) return;
      sessionStorage.setItem(LOCK, "1");

      try {
        // Instance TEMPORAIRE (pas le singleton)
        const tmp = new Keycloak({
          url: "https://keycloak.ialla.fr",
          realm: "haas",
          clientId: "react-app",
        });

        // On force CODE flow + PARAMS en QUERY (pas en fragment)
        const opts = {
          onLoad: "check-sso" as const,       // on finalisera nous-mêmes
          flow: "standard" as const,
          responseMode: "query" as const,     // <-- évite #state=...
          pkceMethod: "S256" as const,
          checkLoginIframe: false,
        };

        const url = new URL(window.location.href);
        const hasCode =
          url.searchParams.has("code") || url.searchParams.has("session_state");

        if (!hasCode) {
          // Pas encore de code -> demande un login avec retour EXACT sur cette page (query)
          const clean = `${url.origin}${url.pathname}${url.search}`; // pas de hash
          await tmp.login({
            redirectUri: clean,
            scope: "openid profile email groups",
          });
          return; // le navigateur part sur Keycloak
        }

        // Il y a un code -> finaliser ici
        const ok = await tmp.init(opts);
        if (!ok || !tmp.token || !tmp.refreshToken) {
          // Si pour une raison X on n'a pas de token, relance un login propre
          const clean = `${url.origin}${url.pathname}${url.search}`;
          await tmp.login({
            redirectUri: clean,
            scope: "openid profile email groups",
          });
          return;
        }

        // STOCKE les jetons pour le reste de l'app
        sessionStorage.setItem("kc_access_token", tmp.token);
        sessionStorage.setItem("kc_refresh_token", tmp.refreshToken);

        // Cible : param 'to', sinon via groupes
        let target = url.searchParams.get("to") || "/";
        if (!url.searchParams.get("to")) {
          const groups = (tmp.tokenParsed?.groups ?? []) as string[];
          target =
            groups?.includes?.("/client")
              ? "/client-dashboard"
              : groups?.some?.((g) => ["/resource", "/ressource", "/candidate"].includes(g))
              ? "/candidate-dashboard"
              : "/client-dashboard";
        }

        // Redirection finale (URL propre, sans code)
        window.location.replace(target);
      } catch (e) {
        console.error("[AuthCallback] error", e);
        // Fallback: on repart sur la même page de callback (une seule fois grâce au LOCK)
        const here = `${location.origin}${location.pathname}${location.search}`;
        window.location.assign(here);
      } finally {
        // Libère le lock pour une future auth
        sessionStorage.removeItem(LOCK);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Connexion en cours…</p>
    </main>
  );
}
