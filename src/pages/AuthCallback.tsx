import { useEffect } from "react";
import { keycloak } from "@/lib/keycloak";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      try {
        // finalise le code flow ICI (et seulement ici)
        const ok = await keycloak.init({
          onLoad: "login-required",
          pkceMethod: "S256",
          checkLoginIframe: false,
        });

        if (!ok) {
          // pas authentifié => relance login sur cette même page
          await keycloak.login({ redirectUri: window.location.href, scope: "openid profile email groups" });
          return;
        }

        // cible de retour (si fournie)
        const url = new URL(window.location.href);
        let target = url.searchParams.get("to") || "/";

        // sinon, calcule selon les groupes
        const groups = (keycloak.tokenParsed?.groups ?? []) as string[];
        if (!url.searchParams.get("to")) {
          target =
            groups.includes("/client") ? "/client-dashboard" :
            groups.some(g => ["/resource", "/ressource", "/candidate"].includes(g)) ? "/candidate-dashboard" :
            "/client-dashboard";
        }

        // nettoie l’URL et redirige
        window.location.replace(target);
      } catch (e) {
        console.error("[AuthCallback] init/login error", e);
        // fallback: retente un login vers cette page
        await keycloak.login({ redirectUri: window.location.href, scope: "openid profile email groups" });
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Connexion en cours…</p>
    </main>
  );
}
