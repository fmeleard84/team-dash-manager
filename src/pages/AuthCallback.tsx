import { useEffect } from "react";
import { keycloak, storeTokensFromKC } from "@/lib/keycloak";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      try {
        // finalise le code flow ICI
        const ok = await keycloak.init({
          onLoad: "login-required",
          pkceMethod: "S256",
          checkLoginIframe: false,
        });

        if (!ok) {
          await keycloak.login({ redirectUri: window.location.href, scope: "openid profile email groups" });
          return;
        }

        // >>> STOCKE les jetons pour les prochaines pages <<<
        storeTokensFromKC();

        // calcule la cible
        const url = new URL(window.location.href);
        let target = url.searchParams.get("to") || "/";
        if (!url.searchParams.get("to")) {
          const groups = (keycloak.tokenParsed?.groups ?? []) as string[];
          target =
            groups.includes("/client") ? "/client-dashboard" :
            groups.some(g => ["/resource", "/ressource", "/candidate"].includes(g)) ? "/candidate-dashboard" :
            "/client-dashboard";
        }

        window.location.replace(target);
      } catch (e) {
        console.error("[AuthCallback] error", e);
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
